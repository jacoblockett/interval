import EventEmitter from "events"
import { nanoid } from "nanoid"

class Interval extends EventEmitter {
	#actions = []
	#id
	#interval
	#intervalsCompleted = 0
	#startTime

	/**
	 * Creates an Interval - a glorified setInterval :)
	 *
	 * @param {Number} [interval] (default = `1000`)
	 */
	constructor(interval) {
		super()

		if (typeof interval !== "number") {
			this.#interval = 1000
		} else {
			this.#interval = Math.floor(interval)
		}
	}

	/**
	 * Checks if the given action (actionID) exists within the action stack.
	 *
	 * @param {String} actionID
	 * @returns {Boolean}
	 */
	#actionExists(actionID) {
		return !!this.#actions.filter(s => s.actionID === actionID).length
	}

	/**
	 * Creates an ID to be used for actions.
	 *
	 * @returns {String}
	 */
	#createID() {
		let actionID = nanoid(8)

		while (this.#actionExists(actionID)) {
			actionID = nanoid(8)
		}

		return actionID
	}

	/**
	 * Deletes the given action (actionID) from the action stack.
	 *
	 * @param {String} actionID
	 */
	#deleteAction(actionID) {
		this.#actions = this.#actions.filter(s => s.actionID !== actionID)
	}

	/**
	 * Updates the interval, running any actions from the action stack in the process.
	 */
	#update() {
		this.emit("updating", {
			intervalsCompleted: this.#intervalsCompleted,
			startTime: this.#startTime,
		})

		for (let i = 0; i < this.#actions.length; i++) {
			this.#actions[i].action()
		}

		this.#intervalsCompleted += 1
		this.emit("updated", {
			intervalsCompleted: this.#intervalsCompleted,
			startTime: this.#startTime,
		})
	}

	/**
	 * Ends the interval and performs cleanup.
	 *
	 * @returns {{intervalsCompleted: Number, startTime: BigInt}}
	 */
	#clear() {
		clearInterval(this.#id)

		const intervalsCompleted = this.#intervalsCompleted
		const startTime = this.#startTime

		this.#id = undefined
		this.#intervalsCompleted = 0
		this.#startTime = undefined

		return { intervalsCompleted, startTime }
	}

	/**
	 * Starts the interval.
	 */
	start() {
		if (!this.#id) {
			this.emit("start")
			this.#startTime = process.hrtime.bigint()
			this.#update()
			this.#id = setInterval(this.#update.bind(this), this.#interval)
		}
	}

	/**
	 * Adds an action to the action stack. This action will be performed on
	 * every subsequent interval after it was added.
	 *
	 * @param {Function} action The action to add to the stack
	 * @param {String} [actionID] A custom action ID
	 * @returns {String} The action ID to use with `removeAction`
	 */
	addAction(action, actionID) {
		if (typeof action !== "function") {
			throw new Error(`Expected action to be a function`)
		}
		if (!actionID || typeof actionID !== "string") {
			actionID = this.#createID()
		}
		if (this.#actionExists(actionID)) {
			throw new Error(
				`The action ID '${actionID}' is already bound to an action`,
			)
		}

		this.#actions.push({ actionID, action })
		this.emit("actionAdded")

		return actionID
	}

	/**
	 * Removes an action from the action stack.
	 *
	 * @param {String} actionID The action ID to remove
	 */
	removeAction(actionID) {
		if (!this.#actionExists(actionID)) {
			throw new Error(`The actionID '${actionID}' doesn't exist`)
		}

		this.#deleteAction(actionID)
		this.emit("actionRemoved")
	}

	/**
	 * Stops the interval.
	 *
	 * @returns {{intervalsCompleted: Number, timeStarted: BigInt, timeStopped: BigInt, timeElapsed: BigInt}}
	 */
	stop() {
		if (this.#id) {
			this.emit("stopping", {
				intervalsCompleted: this.#intervalsCompleted,
				startTime: this.#startTime,
			})

			const { intervalsCompleted, startTime } = this.#clear()
			const stopFinishTime = process.hrtime.bigint()
			const finalDetails = {
				intervalsCompleted: intervalsCompleted,
				timeStarted: startTime,
				timeStopped: stopFinishTime,
				timeElapsed: stopFinishTime - startTime,
			}

			this.emit("stopped", finalDetails)

			return finalDetails
		}
	}

	/**
	 * Checks if the interval is currently running.
	 */
	get isRunning() {
		return !!this.#id
	}

	/**
	 * Sets the interval of the current Interval object.
	 *
	 * @param {Number} interval
	 */
	setInterval(interval) {
		if (isNumber(interval)) {
			this.#interval = interval
		}
	}
}

export default Interval
