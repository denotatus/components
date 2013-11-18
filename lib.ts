/**
 * Created by denotatus on 07.11.13.
 * Last change 18.11.13
 */

module components {

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

    export class Event {
        constructor(public type:string, public target:IEventTarget, public data?:any, public defaultPrevented = false, public propagationStopped = false) {
        }

        public preventDefault():void {
            this.defaultPrevented = true;
        }

        public stopPropagation():void {
            this.propagationStopped = true;
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
            if (!eventType) throw Exception.argumentNotDefined("eventType");
            if (/\s/.test(eventType)) throw Exception.invalidArgument("eventType", "Event type must contain no whitespaces.");
            if (!listener) throw Exception.argumentNotDefined("listener");

            var listenerInfo = { listener: listener, priority: priority };
            var listeners = this._listeners[eventType];
            if (!(listeners && listeners.length)) {
                listeners = this._listeners[eventType] = [listenerInfo]
            } else {
                // prevent duplicate listeners
                for (var i = 0, curr; curr = listeners[i]; i++) {
                    if (curr.listener === listener) {
                        if (curr.priority == priority) {
                            return;
                        }
                        listeners.splice(i, 1);
                    }
                }
                // place listener according to it`s priority
                var len = listeners.length;
                if (listeners[0].priority > priority) {
                    listeners.unshift(listenerInfo);
                } else if (listeners[len - 1].priority <= priority) {
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
            if (!eventType) throw Exception.argumentNotDefined("eventType");

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
            if (!event) throw Exception.argumentNotDefined("event");

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
                        if (event.propagationStopped) break;
                    } catch (err) {
                    }
                }

                return event.defaultPrevented;
            }
            return false;
        }

        public hasListener(eventType:string):boolean {
            return !!this._listeners[eventType];
        }

        public clone():IEventTarget {
            var clone = new (<any>this).constructor(this._target);
            for (var eventType in this._listeners) {
                clone._listeners[eventType] = this._listeners[eventType];
            }
            return clone;
        }
    }

    export class Component extends EventTarget {
        private _properties:{ [key: string]: any
        } = {};

        constructor() {
            super();
        }

        public $get<T>(propName:string):T {
            return <T>this._properties[propName];
        }

        public $set<T>(propName:string, value:T):boolean {
            if (!propName) throw Exception.argumentNotDefined("propName");
            if (/\s/.test(propName)) throw Exception.invalidArgument("propName", "Property name must contains no whitespaces.");

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