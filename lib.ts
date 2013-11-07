/**
 * Created by denotat on 11/7/13.
 */

/**
 * Created by denotat on 11/3/13.
 */

module components {

    export class Exception {
        public static argumentUndefined(argName: string): Error {
            return new Error("Argument '" + argName + "' can`t be undefined.");
        }
        public static argumentNull(argName: string): Error {
            return new Error("Argument '" + argName + "' can`t be null.");
        }
        public static argumentNotDefined(argName: string): Error {
            return new Error("Argument '" + argName + "' is not defined.");
        }
        public static invalidArgument(argName: string, message?: string): Error {
            return new Error("Argument '" + argName + "' has invalid value" + message ? (": " + message) : ".");
        }
    }

    export class Event {
        constructor(
            public type: string,
            public target: IEventTarget,
            public data?: any,
            public defaultPrevented = false,
            public propagationStopped = false) { }

        public preventDefault(): void {
            this.defaultPrevented = true;
        }

        public stopPropagation(): void {
            this.propagationStopped = true;
        }
    }

    export interface IComparable {
        compareTo(obj: any): number;
    }

    export interface IEventListener {
        handleEvent(event: Event);
    }

    export interface IEventTarget {
        addEventListener(eventType: string, listener: IEventListener): void;
        removeEventListener(eventType: string, listener: IEventListener): void;
        dispatchEvent(event: Event): boolean;
        dispatchEvent(eventType: string, eventData?: any): boolean;
    }

    export class EventTarget implements IEventTarget {
        private _target: IEventTarget;
        private _listeners: { [key: string]: Array<IEventListener> };

        constructor(target?: IEventTarget) {
            this._target = target || this;
            this._listeners = {};
        }

        public addEventListener(eventType: string, listener: IEventListener): void {
            if (!eventType) throw Exception.argumentNotDefined("eventType");
            if (/\s/.test(eventType)) throw Exception.invalidArgument("eventType", "Event type must not contain whitespaces");
            if (!listener) throw Exception.argumentNotDefined("listener");

            var listeners = this._listeners[eventType] || (this._listeners[eventType] = new Array<IEventListener>());
            listeners.push(listener);
        }

        public removeEventListener(eventType: string, listener?: IEventListener): void {
            if (!eventType) throw Exception.argumentNotDefined("eventType");

            if (typeof (listener) === "undefined") {
                delete this._listeners[eventType];
            } else {
                var listeners = this._listeners[eventType];
                if (listeners && listeners.length) {
                    for(var i = listeners.length - 1; i >= 0; i--) {
                        if (listener === listeners[i]) {
                            listeners.splice(i, 1);
                        }
                    }
                }
            }
        }

        public dispatchEvent(event:any, eventData?: any): boolean {
            if (!event) throw Exception.argumentNotDefined("event");

            var listeners = this._listeners[event.type];
            if (listeners && listeners.length) {

                if (typeof (event === "string")) {
                    event = new Event(<string>event, eventData);
                } else if (typeof (eventData) !== "undefined") {
                    event.data = eventData;
                }

                event.target = this._target;

                for(var i = 0, len = listeners.length; i < len; i++) {
                    try {
                        listeners[i].handleEvent(event);
                        if (event.propagationStopped) break;
                    } catch (err) { }
                }

                return event.defaultPrevented;
            }
            return false;
        }

        public hasListener(eventType: string): boolean {
            return !!this._listeners[eventType];
        }
    }

    export class Component extends EventTarget {
        private _properties: { [key: string]: any } = {};

        constructor() {
            super();
        }

        public getProperty<T>(propName: string): T {
            return <T>this._properties[propName];
        }

        public setProperty<T>(propName: string, value: T): boolean {
            if (!propName) throw Exception.argumentNotDefined("propName");
            if (/\s/.test(propName)) throw Exception.invalidArgument("propName", "Whitespaces in property is not allowed.");

            var prev = this.getProperty(propName);
            if (prev !== value && (typeof (prev) !== "undefined" && typeof (prev.compareTo) === "function" && prev.compareTo(value) != 0)) {
                agreement: var EVENT_TYPE = propName + "Change";
                if (!this.dispatchEvent(EVENT_TYPE, value)) {
                    this._properties[propName] = value;
                    return true;
                }
            }
            this.prop("tes", 1);
            return false;
        }

        public prop<T>(propName: string, value?: T): any {
            var val = this.getProperty(propName);
            if (typeof(value) !== "undefined") {
                this.setProperty(propName, value);
            }
            return val;
        }
    }
}