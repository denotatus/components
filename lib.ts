/**
 * Created by denotatus on 07.11.13.
 * Last change 18.11.13
 */

module components {

    export class StringExt {
        public static isNullOrEmpty(str: string): boolean {
            return !!str;
        }
    }

    export class Exception {
        public static argumentUndefined(argName:string):Error {
            return new Error("Argument '" + argName + "' can`t be undefined.");
        }

        public static argumentNull(argName:string):Error {
            return new Error("Argument '" + argName + "' can`t be null.");
        }

        public static argumentNotDefined(argName:string):Error {
            return new Error("Argument '" + argName + "' is not defined.");
        }

        public static invalidArgument(argName:string, message?:string):Error {
            return new Error("Argument '" + argName + "' has invalid value" + message ? (": " + message) : ".");
        }
    }

    export interface IArgumentValidationInfo {
        name: string;
        mayByNull?: boolean;
        identifier?: boolean;
    }

    export class Func {
        public static validateArguments(args: IArguments, expectedArgs: Array<IArgumentValidationInfo>): Error {
            var err:Error = null;

            for(var i = 0, len = expectedArgs.length; i < len; i++) {
                var expectedArg = expectedArgs[i];
                if (!expectedArg)
                    throw Exception.invalidArgument("expectedArgs", "Validation info not defined for parameter with index " + i);

                err = Func.validateArgument(args[i], expectedArg);
                if (err !== null) {
                    break;
                }
            }
            return err;
        }

        public static validateArgument(arg, argInfo: IArgumentValidationInfo):Error {
            var err: Error = null;

            var argName = argInfo.name;
            if (typeof (arg) === "undefined" && !argInfo.mayByNull) {
                return Exception.argumentUndefined(argName);
            } else if (arg === null && !argInfo.mayByNull) {
                return Exception.argumentNull(argName);
            } else {
                if (argInfo.identifier) {
                    if (typeof (arg) === "string" || arg.constructor === String) {
                        if (arg) {
                            if (!/\s/.test(arg)) {
                                if (!/^([_$A-z])+[0-9_$A-z]*$/.test(arg)) {
                                    err = Exception.invalidArgument(argName, "Contains not allowed characters.");
                                }
                            } else {
                                err = Exception.invalidArgument(argName, "Must contain no whitespace.");
                            }
                        } else {
                            err = Exception.invalidArgument(argName, "Not empty string expected.");
                        }
                    } else {
                        err = Exception.invalidArgument(argName, "String expected.");
                    }
                }
            }
            return err;
        }

        public static createDelegate(instance: any, method: Function): Function {
            return function() {
                method.apply(instance, arguments);
            }
        }

        public static RETURN_FALSE = () => false;

        public static RETURN_TRUE = () => true;
    }

    export class Event {

        constructor(public type:string, public target:IEventTarget, public data?:any) {
        }

        public isDefaultPrevented = Func.RETURN_FALSE;

        public isPropagationStopped = Func.RETURN_FALSE;

        public preventDefault():void {
            this.isDefaultPrevented = Func.RETURN_TRUE;
        }

        public stopPropagation():void {
            this.isPropagationStopped = Func.RETURN_TRUE;
        }
    }

    export interface IComparable {
        compareTo(obj:any): number;
    }

    export interface ICloneable<T> {
        clone(): T;
    }

    export interface IEventListener {
        handleEvent(event:Event);
    }

    export interface IEventTarget {
        addEventListener(eventType:string, listener:IEventListener, priority?:EventPriority): void;
        removeEventListener(eventType:string, listener:IEventListener): void;
        dispatchEvent(event:Event): boolean;
        dispatchEvent(eventType:string, eventData?:any): boolean;
    }

    export enum EventPriority {
        Minimum = Number.MIN_VALUE,
        Lower = -1,
        Normal = 0,
        Higher = 1,
        Maximum = Number.MAX_VALUE,
    }

    export class EventTarget implements IEventTarget, ICloneable<IEventTarget> {
        private _target:IEventTarget;
        private _listeners:{ [key: string]: Array<{ listener: IEventListener; priority: EventPriority; }> };

        constructor(target?:IEventTarget) {
            this._target = target || this;
            this._listeners = {};
        }

        public addEventListener(eventType:string, listener:IEventListener, priority = EventPriority.Normal):void {
            var e = Func.validateArguments(arguments, [
                { name: "eventType", identifier: true},
                { name: "listener" }
            ]);
            if (e) throw e;

            var listenerInfo = { listener: listener, priority: priority };
            var listeners = this._listeners[eventType];
            if (!(listeners && listeners.length)) {
                this._listeners[eventType] = [listenerInfo];
            } else {
                // prevent duplicate listeners
                for (var i = 0, curr; curr = listeners[i]; i++) {
                    if (curr.listener === listener) {
                        if (curr.priority === priority) {
                            return;
                        }
                        listeners.splice(i, 1);
                        break;
                    }
                }
                // place listener according to it`s priority
                var len = listeners.length;
                if (listeners[len - 1].priority <= priority) {
                    listeners.push(listenerInfo);
                } else {
                    for (var i = 0; i < len; i++) {
                        if (listeners[i].priority > priority) {
                            listeners.splice(i, 0, listenerInfo);
                            break;
                        }
                    }
                }
            }
        }

        public removeEventListener(eventType:string, listener?:IEventListener):void {
            var e = Func.validateArgument(eventType, {name: "eventType" });
            if (e) throw e;

            if (typeof (listener) === "undefined") {
                delete this._listeners[eventType];
            } else {
                var listeners = this._listeners[eventType];
                if (listeners && listeners.length) {
                    for (var i = listeners.length - 1; i >= 0; i--) {
                        if (listener === listeners[i].listener) {
                            listeners.splice(i, 1);
                        }
                    }
                }
            }
        }

        public dispatchEvent(event:any, eventData?:any):boolean {
            var e = Func.validateArgument(event, {name: "event" });
            if (e) throw e;

            var listeners = this._listeners[event.type];
            if (listeners && listeners.length) {

                if (typeof (event) === "string") {
                    event = new Event(<string>event, eventData);
                } else if (typeof (eventData) !== "undefined") {
                    event.data = eventData;
                }

                event.target = this._target;

                for (var i = 0, len = listeners.length; i < len; i++) {
                    try {
                        listeners[i].listener.handleEvent(event);
                        if (event.isPropagationStopped()) break;
                    } catch (err) { }
                }

                return event.isDefaultPrevented();
            }
            return false;
        }

        public hasEventListener(eventType:string):boolean {
            return !!this._listeners[eventType];
        }

        public clone():IEventTarget {
            var clone: EventTarget = new (<any>this).constructor(this._target);

            var listeners = this._listeners;
            for (var eventType in listeners) {
                if (listeners.hasOwnProperty(eventType)) {
                    clone._listeners[eventType] = listeners[eventType];
                }
            }
            return clone;
        }
    }

    export class Component extends EventTarget {
        private _properties:{ [key: string]: any } = {};

        constructor() {
            super();
        }

        public $get<T>(propName:string):T {
            return <T>this._properties[propName];
        }

        public $set<T>(propName:string, value:T):boolean {
            var e = Func.validateArgument(propName, { name: "propName", identifier: true });
            if (e) throw e;

            var prev = this.$get(propName);
            if (prev !== value && (typeof (prev) !== "undefined" && typeof (prev.compareTo) === "function" && prev.compareTo(value) != 0)) {
                agreement: var EVENT_TYPE = propName + "Change";
                if (!this.dispatchEvent(EVENT_TYPE, value)) {
                    this._properties[propName] = value;
                    return true;
                }
            }
            return false;
        }
    }
}