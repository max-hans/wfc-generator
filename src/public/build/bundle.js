
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function set_custom_element_data(node, prop, value) {
        if (prop in node) {
            node[prop] = value;
        }
        else {
            attr(node, prop, value);
        }
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);

    function bind(component, name, callback) {
        const index = component.$$.props[name];
        if (index !== undefined) {
            component.$$.bound[index] = callback;
            callback(component.$$.ctx[index]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.31.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function getDefaultExportFromCjs (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    function createCommonjsModule(fn, basedir, module) {
    	return module = {
    		path: basedir,
    		exports: {},
    		require: function (path, base) {
    			return commonjsRequire(path, (base === undefined || base === null) ? module.path : base);
    		}
    	}, fn(module, module.exports), module.exports;
    }

    function getAugmentedNamespace(n) {
    	if (n.__esModule) return n;
    	var a = Object.defineProperty({}, '__esModule', {value: true});
    	Object.keys(n).forEach(function (k) {
    		var d = Object.getOwnPropertyDescriptor(n, k);
    		Object.defineProperty(a, k, d.get ? d : {
    			enumerable: true,
    			get: function () {
    				return n[k];
    			}
    		});
    	});
    	return a;
    }

    function commonjsRequire () {
    	throw new Error('Dynamic requires are not currently supported by @rollup/plugin-commonjs');
    }

    var global$1 = (typeof global !== "undefined" ? global :
                typeof self !== "undefined" ? self :
                typeof window !== "undefined" ? window : {});

    var lookup = [];
    var revLookup = [];
    var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array;
    var inited = false;
    function init$1 () {
      inited = true;
      var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
      for (var i = 0, len = code.length; i < len; ++i) {
        lookup[i] = code[i];
        revLookup[code.charCodeAt(i)] = i;
      }

      revLookup['-'.charCodeAt(0)] = 62;
      revLookup['_'.charCodeAt(0)] = 63;
    }

    function toByteArray (b64) {
      if (!inited) {
        init$1();
      }
      var i, j, l, tmp, placeHolders, arr;
      var len = b64.length;

      if (len % 4 > 0) {
        throw new Error('Invalid string. Length must be a multiple of 4')
      }

      // the number of equal signs (place holders)
      // if there are two placeholders, than the two characters before it
      // represent one byte
      // if there is only one, then the three characters before it represent 2 bytes
      // this is just a cheap hack to not do indexOf twice
      placeHolders = b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0;

      // base64 is 4/3 + up to two characters of the original data
      arr = new Arr(len * 3 / 4 - placeHolders);

      // if there are placeholders, only get up to the last complete 4 chars
      l = placeHolders > 0 ? len - 4 : len;

      var L = 0;

      for (i = 0, j = 0; i < l; i += 4, j += 3) {
        tmp = (revLookup[b64.charCodeAt(i)] << 18) | (revLookup[b64.charCodeAt(i + 1)] << 12) | (revLookup[b64.charCodeAt(i + 2)] << 6) | revLookup[b64.charCodeAt(i + 3)];
        arr[L++] = (tmp >> 16) & 0xFF;
        arr[L++] = (tmp >> 8) & 0xFF;
        arr[L++] = tmp & 0xFF;
      }

      if (placeHolders === 2) {
        tmp = (revLookup[b64.charCodeAt(i)] << 2) | (revLookup[b64.charCodeAt(i + 1)] >> 4);
        arr[L++] = tmp & 0xFF;
      } else if (placeHolders === 1) {
        tmp = (revLookup[b64.charCodeAt(i)] << 10) | (revLookup[b64.charCodeAt(i + 1)] << 4) | (revLookup[b64.charCodeAt(i + 2)] >> 2);
        arr[L++] = (tmp >> 8) & 0xFF;
        arr[L++] = tmp & 0xFF;
      }

      return arr
    }

    function tripletToBase64 (num) {
      return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F]
    }

    function encodeChunk (uint8, start, end) {
      var tmp;
      var output = [];
      for (var i = start; i < end; i += 3) {
        tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + (uint8[i + 2]);
        output.push(tripletToBase64(tmp));
      }
      return output.join('')
    }

    function fromByteArray (uint8) {
      if (!inited) {
        init$1();
      }
      var tmp;
      var len = uint8.length;
      var extraBytes = len % 3; // if we have 1 byte left, pad 2 bytes
      var output = '';
      var parts = [];
      var maxChunkLength = 16383; // must be multiple of 3

      // go through the array every three bytes, we'll deal with trailing stuff later
      for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
        parts.push(encodeChunk(uint8, i, (i + maxChunkLength) > len2 ? len2 : (i + maxChunkLength)));
      }

      // pad the end with zeros, but make sure to not forget the extra bytes
      if (extraBytes === 1) {
        tmp = uint8[len - 1];
        output += lookup[tmp >> 2];
        output += lookup[(tmp << 4) & 0x3F];
        output += '==';
      } else if (extraBytes === 2) {
        tmp = (uint8[len - 2] << 8) + (uint8[len - 1]);
        output += lookup[tmp >> 10];
        output += lookup[(tmp >> 4) & 0x3F];
        output += lookup[(tmp << 2) & 0x3F];
        output += '=';
      }

      parts.push(output);

      return parts.join('')
    }

    function read (buffer, offset, isLE, mLen, nBytes) {
      var e, m;
      var eLen = nBytes * 8 - mLen - 1;
      var eMax = (1 << eLen) - 1;
      var eBias = eMax >> 1;
      var nBits = -7;
      var i = isLE ? (nBytes - 1) : 0;
      var d = isLE ? -1 : 1;
      var s = buffer[offset + i];

      i += d;

      e = s & ((1 << (-nBits)) - 1);
      s >>= (-nBits);
      nBits += eLen;
      for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

      m = e & ((1 << (-nBits)) - 1);
      e >>= (-nBits);
      nBits += mLen;
      for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

      if (e === 0) {
        e = 1 - eBias;
      } else if (e === eMax) {
        return m ? NaN : ((s ? -1 : 1) * Infinity)
      } else {
        m = m + Math.pow(2, mLen);
        e = e - eBias;
      }
      return (s ? -1 : 1) * m * Math.pow(2, e - mLen)
    }

    function write (buffer, value, offset, isLE, mLen, nBytes) {
      var e, m, c;
      var eLen = nBytes * 8 - mLen - 1;
      var eMax = (1 << eLen) - 1;
      var eBias = eMax >> 1;
      var rt = (mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0);
      var i = isLE ? 0 : (nBytes - 1);
      var d = isLE ? 1 : -1;
      var s = value < 0 || (value === 0 && 1 / value < 0) ? 1 : 0;

      value = Math.abs(value);

      if (isNaN(value) || value === Infinity) {
        m = isNaN(value) ? 1 : 0;
        e = eMax;
      } else {
        e = Math.floor(Math.log(value) / Math.LN2);
        if (value * (c = Math.pow(2, -e)) < 1) {
          e--;
          c *= 2;
        }
        if (e + eBias >= 1) {
          value += rt / c;
        } else {
          value += rt * Math.pow(2, 1 - eBias);
        }
        if (value * c >= 2) {
          e++;
          c /= 2;
        }

        if (e + eBias >= eMax) {
          m = 0;
          e = eMax;
        } else if (e + eBias >= 1) {
          m = (value * c - 1) * Math.pow(2, mLen);
          e = e + eBias;
        } else {
          m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
          e = 0;
        }
      }

      for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

      e = (e << mLen) | m;
      eLen += mLen;
      for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

      buffer[offset + i - d] |= s * 128;
    }

    var toString = {}.toString;

    var isArray = Array.isArray || function (arr) {
      return toString.call(arr) == '[object Array]';
    };

    var INSPECT_MAX_BYTES = 50;

    /**
     * If `Buffer.TYPED_ARRAY_SUPPORT`:
     *   === true    Use Uint8Array implementation (fastest)
     *   === false   Use Object implementation (most compatible, even IE6)
     *
     * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
     * Opera 11.6+, iOS 4.2+.
     *
     * Due to various browser bugs, sometimes the Object implementation will be used even
     * when the browser supports typed arrays.
     *
     * Note:
     *
     *   - Firefox 4-29 lacks support for adding new properties to `Uint8Array` instances,
     *     See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438.
     *
     *   - Chrome 9-10 is missing the `TypedArray.prototype.subarray` function.
     *
     *   - IE10 has a broken `TypedArray.prototype.subarray` function which returns arrays of
     *     incorrect length in some situations.

     * We detect these buggy browsers and set `Buffer.TYPED_ARRAY_SUPPORT` to `false` so they
     * get the Object implementation, which is slower but behaves correctly.
     */
    Buffer.TYPED_ARRAY_SUPPORT = global$1.TYPED_ARRAY_SUPPORT !== undefined
      ? global$1.TYPED_ARRAY_SUPPORT
      : true;

    function kMaxLength () {
      return Buffer.TYPED_ARRAY_SUPPORT
        ? 0x7fffffff
        : 0x3fffffff
    }

    function createBuffer (that, length) {
      if (kMaxLength() < length) {
        throw new RangeError('Invalid typed array length')
      }
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        // Return an augmented `Uint8Array` instance, for best performance
        that = new Uint8Array(length);
        that.__proto__ = Buffer.prototype;
      } else {
        // Fallback: Return an object instance of the Buffer class
        if (that === null) {
          that = new Buffer(length);
        }
        that.length = length;
      }

      return that
    }

    /**
     * The Buffer constructor returns instances of `Uint8Array` that have their
     * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
     * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
     * and the `Uint8Array` methods. Square bracket notation works as expected -- it
     * returns a single octet.
     *
     * The `Uint8Array` prototype remains unmodified.
     */

    function Buffer (arg, encodingOrOffset, length) {
      if (!Buffer.TYPED_ARRAY_SUPPORT && !(this instanceof Buffer)) {
        return new Buffer(arg, encodingOrOffset, length)
      }

      // Common case.
      if (typeof arg === 'number') {
        if (typeof encodingOrOffset === 'string') {
          throw new Error(
            'If encoding is specified then the first argument must be a string'
          )
        }
        return allocUnsafe(this, arg)
      }
      return from(this, arg, encodingOrOffset, length)
    }

    Buffer.poolSize = 8192; // not used by this implementation

    // TODO: Legacy, not needed anymore. Remove in next major version.
    Buffer._augment = function (arr) {
      arr.__proto__ = Buffer.prototype;
      return arr
    };

    function from (that, value, encodingOrOffset, length) {
      if (typeof value === 'number') {
        throw new TypeError('"value" argument must not be a number')
      }

      if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) {
        return fromArrayBuffer(that, value, encodingOrOffset, length)
      }

      if (typeof value === 'string') {
        return fromString(that, value, encodingOrOffset)
      }

      return fromObject(that, value)
    }

    /**
     * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
     * if value is a number.
     * Buffer.from(str[, encoding])
     * Buffer.from(array)
     * Buffer.from(buffer)
     * Buffer.from(arrayBuffer[, byteOffset[, length]])
     **/
    Buffer.from = function (value, encodingOrOffset, length) {
      return from(null, value, encodingOrOffset, length)
    };

    if (Buffer.TYPED_ARRAY_SUPPORT) {
      Buffer.prototype.__proto__ = Uint8Array.prototype;
      Buffer.__proto__ = Uint8Array;
    }

    function assertSize (size) {
      if (typeof size !== 'number') {
        throw new TypeError('"size" argument must be a number')
      } else if (size < 0) {
        throw new RangeError('"size" argument must not be negative')
      }
    }

    function alloc (that, size, fill, encoding) {
      assertSize(size);
      if (size <= 0) {
        return createBuffer(that, size)
      }
      if (fill !== undefined) {
        // Only pay attention to encoding if it's a string. This
        // prevents accidentally sending in a number that would
        // be interpretted as a start offset.
        return typeof encoding === 'string'
          ? createBuffer(that, size).fill(fill, encoding)
          : createBuffer(that, size).fill(fill)
      }
      return createBuffer(that, size)
    }

    /**
     * Creates a new filled Buffer instance.
     * alloc(size[, fill[, encoding]])
     **/
    Buffer.alloc = function (size, fill, encoding) {
      return alloc(null, size, fill, encoding)
    };

    function allocUnsafe (that, size) {
      assertSize(size);
      that = createBuffer(that, size < 0 ? 0 : checked(size) | 0);
      if (!Buffer.TYPED_ARRAY_SUPPORT) {
        for (var i = 0; i < size; ++i) {
          that[i] = 0;
        }
      }
      return that
    }

    /**
     * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
     * */
    Buffer.allocUnsafe = function (size) {
      return allocUnsafe(null, size)
    };
    /**
     * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
     */
    Buffer.allocUnsafeSlow = function (size) {
      return allocUnsafe(null, size)
    };

    function fromString (that, string, encoding) {
      if (typeof encoding !== 'string' || encoding === '') {
        encoding = 'utf8';
      }

      if (!Buffer.isEncoding(encoding)) {
        throw new TypeError('"encoding" must be a valid string encoding')
      }

      var length = byteLength(string, encoding) | 0;
      that = createBuffer(that, length);

      var actual = that.write(string, encoding);

      if (actual !== length) {
        // Writing a hex string, for example, that contains invalid characters will
        // cause everything after the first invalid character to be ignored. (e.g.
        // 'abxxcd' will be treated as 'ab')
        that = that.slice(0, actual);
      }

      return that
    }

    function fromArrayLike (that, array) {
      var length = array.length < 0 ? 0 : checked(array.length) | 0;
      that = createBuffer(that, length);
      for (var i = 0; i < length; i += 1) {
        that[i] = array[i] & 255;
      }
      return that
    }

    function fromArrayBuffer (that, array, byteOffset, length) {
      array.byteLength; // this throws if `array` is not a valid ArrayBuffer

      if (byteOffset < 0 || array.byteLength < byteOffset) {
        throw new RangeError('\'offset\' is out of bounds')
      }

      if (array.byteLength < byteOffset + (length || 0)) {
        throw new RangeError('\'length\' is out of bounds')
      }

      if (byteOffset === undefined && length === undefined) {
        array = new Uint8Array(array);
      } else if (length === undefined) {
        array = new Uint8Array(array, byteOffset);
      } else {
        array = new Uint8Array(array, byteOffset, length);
      }

      if (Buffer.TYPED_ARRAY_SUPPORT) {
        // Return an augmented `Uint8Array` instance, for best performance
        that = array;
        that.__proto__ = Buffer.prototype;
      } else {
        // Fallback: Return an object instance of the Buffer class
        that = fromArrayLike(that, array);
      }
      return that
    }

    function fromObject (that, obj) {
      if (internalIsBuffer(obj)) {
        var len = checked(obj.length) | 0;
        that = createBuffer(that, len);

        if (that.length === 0) {
          return that
        }

        obj.copy(that, 0, 0, len);
        return that
      }

      if (obj) {
        if ((typeof ArrayBuffer !== 'undefined' &&
            obj.buffer instanceof ArrayBuffer) || 'length' in obj) {
          if (typeof obj.length !== 'number' || isnan(obj.length)) {
            return createBuffer(that, 0)
          }
          return fromArrayLike(that, obj)
        }

        if (obj.type === 'Buffer' && isArray(obj.data)) {
          return fromArrayLike(that, obj.data)
        }
      }

      throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.')
    }

    function checked (length) {
      // Note: cannot use `length < kMaxLength()` here because that fails when
      // length is NaN (which is otherwise coerced to zero.)
      if (length >= kMaxLength()) {
        throw new RangeError('Attempt to allocate Buffer larger than maximum ' +
                             'size: 0x' + kMaxLength().toString(16) + ' bytes')
      }
      return length | 0
    }
    Buffer.isBuffer = isBuffer;
    function internalIsBuffer (b) {
      return !!(b != null && b._isBuffer)
    }

    Buffer.compare = function compare (a, b) {
      if (!internalIsBuffer(a) || !internalIsBuffer(b)) {
        throw new TypeError('Arguments must be Buffers')
      }

      if (a === b) return 0

      var x = a.length;
      var y = b.length;

      for (var i = 0, len = Math.min(x, y); i < len; ++i) {
        if (a[i] !== b[i]) {
          x = a[i];
          y = b[i];
          break
        }
      }

      if (x < y) return -1
      if (y < x) return 1
      return 0
    };

    Buffer.isEncoding = function isEncoding (encoding) {
      switch (String(encoding).toLowerCase()) {
        case 'hex':
        case 'utf8':
        case 'utf-8':
        case 'ascii':
        case 'latin1':
        case 'binary':
        case 'base64':
        case 'ucs2':
        case 'ucs-2':
        case 'utf16le':
        case 'utf-16le':
          return true
        default:
          return false
      }
    };

    Buffer.concat = function concat (list, length) {
      if (!isArray(list)) {
        throw new TypeError('"list" argument must be an Array of Buffers')
      }

      if (list.length === 0) {
        return Buffer.alloc(0)
      }

      var i;
      if (length === undefined) {
        length = 0;
        for (i = 0; i < list.length; ++i) {
          length += list[i].length;
        }
      }

      var buffer = Buffer.allocUnsafe(length);
      var pos = 0;
      for (i = 0; i < list.length; ++i) {
        var buf = list[i];
        if (!internalIsBuffer(buf)) {
          throw new TypeError('"list" argument must be an Array of Buffers')
        }
        buf.copy(buffer, pos);
        pos += buf.length;
      }
      return buffer
    };

    function byteLength (string, encoding) {
      if (internalIsBuffer(string)) {
        return string.length
      }
      if (typeof ArrayBuffer !== 'undefined' && typeof ArrayBuffer.isView === 'function' &&
          (ArrayBuffer.isView(string) || string instanceof ArrayBuffer)) {
        return string.byteLength
      }
      if (typeof string !== 'string') {
        string = '' + string;
      }

      var len = string.length;
      if (len === 0) return 0

      // Use a for loop to avoid recursion
      var loweredCase = false;
      for (;;) {
        switch (encoding) {
          case 'ascii':
          case 'latin1':
          case 'binary':
            return len
          case 'utf8':
          case 'utf-8':
          case undefined:
            return utf8ToBytes(string).length
          case 'ucs2':
          case 'ucs-2':
          case 'utf16le':
          case 'utf-16le':
            return len * 2
          case 'hex':
            return len >>> 1
          case 'base64':
            return base64ToBytes(string).length
          default:
            if (loweredCase) return utf8ToBytes(string).length // assume utf8
            encoding = ('' + encoding).toLowerCase();
            loweredCase = true;
        }
      }
    }
    Buffer.byteLength = byteLength;

    function slowToString (encoding, start, end) {
      var loweredCase = false;

      // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
      // property of a typed array.

      // This behaves neither like String nor Uint8Array in that we set start/end
      // to their upper/lower bounds if the value passed is out of range.
      // undefined is handled specially as per ECMA-262 6th Edition,
      // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
      if (start === undefined || start < 0) {
        start = 0;
      }
      // Return early if start > this.length. Done here to prevent potential uint32
      // coercion fail below.
      if (start > this.length) {
        return ''
      }

      if (end === undefined || end > this.length) {
        end = this.length;
      }

      if (end <= 0) {
        return ''
      }

      // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
      end >>>= 0;
      start >>>= 0;

      if (end <= start) {
        return ''
      }

      if (!encoding) encoding = 'utf8';

      while (true) {
        switch (encoding) {
          case 'hex':
            return hexSlice(this, start, end)

          case 'utf8':
          case 'utf-8':
            return utf8Slice(this, start, end)

          case 'ascii':
            return asciiSlice(this, start, end)

          case 'latin1':
          case 'binary':
            return latin1Slice(this, start, end)

          case 'base64':
            return base64Slice(this, start, end)

          case 'ucs2':
          case 'ucs-2':
          case 'utf16le':
          case 'utf-16le':
            return utf16leSlice(this, start, end)

          default:
            if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
            encoding = (encoding + '').toLowerCase();
            loweredCase = true;
        }
      }
    }

    // The property is used by `Buffer.isBuffer` and `is-buffer` (in Safari 5-7) to detect
    // Buffer instances.
    Buffer.prototype._isBuffer = true;

    function swap (b, n, m) {
      var i = b[n];
      b[n] = b[m];
      b[m] = i;
    }

    Buffer.prototype.swap16 = function swap16 () {
      var len = this.length;
      if (len % 2 !== 0) {
        throw new RangeError('Buffer size must be a multiple of 16-bits')
      }
      for (var i = 0; i < len; i += 2) {
        swap(this, i, i + 1);
      }
      return this
    };

    Buffer.prototype.swap32 = function swap32 () {
      var len = this.length;
      if (len % 4 !== 0) {
        throw new RangeError('Buffer size must be a multiple of 32-bits')
      }
      for (var i = 0; i < len; i += 4) {
        swap(this, i, i + 3);
        swap(this, i + 1, i + 2);
      }
      return this
    };

    Buffer.prototype.swap64 = function swap64 () {
      var len = this.length;
      if (len % 8 !== 0) {
        throw new RangeError('Buffer size must be a multiple of 64-bits')
      }
      for (var i = 0; i < len; i += 8) {
        swap(this, i, i + 7);
        swap(this, i + 1, i + 6);
        swap(this, i + 2, i + 5);
        swap(this, i + 3, i + 4);
      }
      return this
    };

    Buffer.prototype.toString = function toString () {
      var length = this.length | 0;
      if (length === 0) return ''
      if (arguments.length === 0) return utf8Slice(this, 0, length)
      return slowToString.apply(this, arguments)
    };

    Buffer.prototype.equals = function equals (b) {
      if (!internalIsBuffer(b)) throw new TypeError('Argument must be a Buffer')
      if (this === b) return true
      return Buffer.compare(this, b) === 0
    };

    Buffer.prototype.inspect = function inspect () {
      var str = '';
      var max = INSPECT_MAX_BYTES;
      if (this.length > 0) {
        str = this.toString('hex', 0, max).match(/.{2}/g).join(' ');
        if (this.length > max) str += ' ... ';
      }
      return '<Buffer ' + str + '>'
    };

    Buffer.prototype.compare = function compare (target, start, end, thisStart, thisEnd) {
      if (!internalIsBuffer(target)) {
        throw new TypeError('Argument must be a Buffer')
      }

      if (start === undefined) {
        start = 0;
      }
      if (end === undefined) {
        end = target ? target.length : 0;
      }
      if (thisStart === undefined) {
        thisStart = 0;
      }
      if (thisEnd === undefined) {
        thisEnd = this.length;
      }

      if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
        throw new RangeError('out of range index')
      }

      if (thisStart >= thisEnd && start >= end) {
        return 0
      }
      if (thisStart >= thisEnd) {
        return -1
      }
      if (start >= end) {
        return 1
      }

      start >>>= 0;
      end >>>= 0;
      thisStart >>>= 0;
      thisEnd >>>= 0;

      if (this === target) return 0

      var x = thisEnd - thisStart;
      var y = end - start;
      var len = Math.min(x, y);

      var thisCopy = this.slice(thisStart, thisEnd);
      var targetCopy = target.slice(start, end);

      for (var i = 0; i < len; ++i) {
        if (thisCopy[i] !== targetCopy[i]) {
          x = thisCopy[i];
          y = targetCopy[i];
          break
        }
      }

      if (x < y) return -1
      if (y < x) return 1
      return 0
    };

    // Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
    // OR the last index of `val` in `buffer` at offset <= `byteOffset`.
    //
    // Arguments:
    // - buffer - a Buffer to search
    // - val - a string, Buffer, or number
    // - byteOffset - an index into `buffer`; will be clamped to an int32
    // - encoding - an optional encoding, relevant is val is a string
    // - dir - true for indexOf, false for lastIndexOf
    function bidirectionalIndexOf (buffer, val, byteOffset, encoding, dir) {
      // Empty buffer means no match
      if (buffer.length === 0) return -1

      // Normalize byteOffset
      if (typeof byteOffset === 'string') {
        encoding = byteOffset;
        byteOffset = 0;
      } else if (byteOffset > 0x7fffffff) {
        byteOffset = 0x7fffffff;
      } else if (byteOffset < -0x80000000) {
        byteOffset = -0x80000000;
      }
      byteOffset = +byteOffset;  // Coerce to Number.
      if (isNaN(byteOffset)) {
        // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
        byteOffset = dir ? 0 : (buffer.length - 1);
      }

      // Normalize byteOffset: negative offsets start from the end of the buffer
      if (byteOffset < 0) byteOffset = buffer.length + byteOffset;
      if (byteOffset >= buffer.length) {
        if (dir) return -1
        else byteOffset = buffer.length - 1;
      } else if (byteOffset < 0) {
        if (dir) byteOffset = 0;
        else return -1
      }

      // Normalize val
      if (typeof val === 'string') {
        val = Buffer.from(val, encoding);
      }

      // Finally, search either indexOf (if dir is true) or lastIndexOf
      if (internalIsBuffer(val)) {
        // Special case: looking for empty string/buffer always fails
        if (val.length === 0) {
          return -1
        }
        return arrayIndexOf(buffer, val, byteOffset, encoding, dir)
      } else if (typeof val === 'number') {
        val = val & 0xFF; // Search for a byte value [0-255]
        if (Buffer.TYPED_ARRAY_SUPPORT &&
            typeof Uint8Array.prototype.indexOf === 'function') {
          if (dir) {
            return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset)
          } else {
            return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset)
          }
        }
        return arrayIndexOf(buffer, [ val ], byteOffset, encoding, dir)
      }

      throw new TypeError('val must be string, number or Buffer')
    }

    function arrayIndexOf (arr, val, byteOffset, encoding, dir) {
      var indexSize = 1;
      var arrLength = arr.length;
      var valLength = val.length;

      if (encoding !== undefined) {
        encoding = String(encoding).toLowerCase();
        if (encoding === 'ucs2' || encoding === 'ucs-2' ||
            encoding === 'utf16le' || encoding === 'utf-16le') {
          if (arr.length < 2 || val.length < 2) {
            return -1
          }
          indexSize = 2;
          arrLength /= 2;
          valLength /= 2;
          byteOffset /= 2;
        }
      }

      function read (buf, i) {
        if (indexSize === 1) {
          return buf[i]
        } else {
          return buf.readUInt16BE(i * indexSize)
        }
      }

      var i;
      if (dir) {
        var foundIndex = -1;
        for (i = byteOffset; i < arrLength; i++) {
          if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
            if (foundIndex === -1) foundIndex = i;
            if (i - foundIndex + 1 === valLength) return foundIndex * indexSize
          } else {
            if (foundIndex !== -1) i -= i - foundIndex;
            foundIndex = -1;
          }
        }
      } else {
        if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;
        for (i = byteOffset; i >= 0; i--) {
          var found = true;
          for (var j = 0; j < valLength; j++) {
            if (read(arr, i + j) !== read(val, j)) {
              found = false;
              break
            }
          }
          if (found) return i
        }
      }

      return -1
    }

    Buffer.prototype.includes = function includes (val, byteOffset, encoding) {
      return this.indexOf(val, byteOffset, encoding) !== -1
    };

    Buffer.prototype.indexOf = function indexOf (val, byteOffset, encoding) {
      return bidirectionalIndexOf(this, val, byteOffset, encoding, true)
    };

    Buffer.prototype.lastIndexOf = function lastIndexOf (val, byteOffset, encoding) {
      return bidirectionalIndexOf(this, val, byteOffset, encoding, false)
    };

    function hexWrite (buf, string, offset, length) {
      offset = Number(offset) || 0;
      var remaining = buf.length - offset;
      if (!length) {
        length = remaining;
      } else {
        length = Number(length);
        if (length > remaining) {
          length = remaining;
        }
      }

      // must be an even number of digits
      var strLen = string.length;
      if (strLen % 2 !== 0) throw new TypeError('Invalid hex string')

      if (length > strLen / 2) {
        length = strLen / 2;
      }
      for (var i = 0; i < length; ++i) {
        var parsed = parseInt(string.substr(i * 2, 2), 16);
        if (isNaN(parsed)) return i
        buf[offset + i] = parsed;
      }
      return i
    }

    function utf8Write (buf, string, offset, length) {
      return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length)
    }

    function asciiWrite (buf, string, offset, length) {
      return blitBuffer(asciiToBytes(string), buf, offset, length)
    }

    function latin1Write (buf, string, offset, length) {
      return asciiWrite(buf, string, offset, length)
    }

    function base64Write (buf, string, offset, length) {
      return blitBuffer(base64ToBytes(string), buf, offset, length)
    }

    function ucs2Write (buf, string, offset, length) {
      return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length)
    }

    Buffer.prototype.write = function write (string, offset, length, encoding) {
      // Buffer#write(string)
      if (offset === undefined) {
        encoding = 'utf8';
        length = this.length;
        offset = 0;
      // Buffer#write(string, encoding)
      } else if (length === undefined && typeof offset === 'string') {
        encoding = offset;
        length = this.length;
        offset = 0;
      // Buffer#write(string, offset[, length][, encoding])
      } else if (isFinite(offset)) {
        offset = offset | 0;
        if (isFinite(length)) {
          length = length | 0;
          if (encoding === undefined) encoding = 'utf8';
        } else {
          encoding = length;
          length = undefined;
        }
      // legacy write(string, encoding, offset, length) - remove in v0.13
      } else {
        throw new Error(
          'Buffer.write(string, encoding, offset[, length]) is no longer supported'
        )
      }

      var remaining = this.length - offset;
      if (length === undefined || length > remaining) length = remaining;

      if ((string.length > 0 && (length < 0 || offset < 0)) || offset > this.length) {
        throw new RangeError('Attempt to write outside buffer bounds')
      }

      if (!encoding) encoding = 'utf8';

      var loweredCase = false;
      for (;;) {
        switch (encoding) {
          case 'hex':
            return hexWrite(this, string, offset, length)

          case 'utf8':
          case 'utf-8':
            return utf8Write(this, string, offset, length)

          case 'ascii':
            return asciiWrite(this, string, offset, length)

          case 'latin1':
          case 'binary':
            return latin1Write(this, string, offset, length)

          case 'base64':
            // Warning: maxLength not taken into account in base64Write
            return base64Write(this, string, offset, length)

          case 'ucs2':
          case 'ucs-2':
          case 'utf16le':
          case 'utf-16le':
            return ucs2Write(this, string, offset, length)

          default:
            if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding)
            encoding = ('' + encoding).toLowerCase();
            loweredCase = true;
        }
      }
    };

    Buffer.prototype.toJSON = function toJSON () {
      return {
        type: 'Buffer',
        data: Array.prototype.slice.call(this._arr || this, 0)
      }
    };

    function base64Slice (buf, start, end) {
      if (start === 0 && end === buf.length) {
        return fromByteArray(buf)
      } else {
        return fromByteArray(buf.slice(start, end))
      }
    }

    function utf8Slice (buf, start, end) {
      end = Math.min(buf.length, end);
      var res = [];

      var i = start;
      while (i < end) {
        var firstByte = buf[i];
        var codePoint = null;
        var bytesPerSequence = (firstByte > 0xEF) ? 4
          : (firstByte > 0xDF) ? 3
          : (firstByte > 0xBF) ? 2
          : 1;

        if (i + bytesPerSequence <= end) {
          var secondByte, thirdByte, fourthByte, tempCodePoint;

          switch (bytesPerSequence) {
            case 1:
              if (firstByte < 0x80) {
                codePoint = firstByte;
              }
              break
            case 2:
              secondByte = buf[i + 1];
              if ((secondByte & 0xC0) === 0x80) {
                tempCodePoint = (firstByte & 0x1F) << 0x6 | (secondByte & 0x3F);
                if (tempCodePoint > 0x7F) {
                  codePoint = tempCodePoint;
                }
              }
              break
            case 3:
              secondByte = buf[i + 1];
              thirdByte = buf[i + 2];
              if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
                tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | (thirdByte & 0x3F);
                if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
                  codePoint = tempCodePoint;
                }
              }
              break
            case 4:
              secondByte = buf[i + 1];
              thirdByte = buf[i + 2];
              fourthByte = buf[i + 3];
              if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
                tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | (fourthByte & 0x3F);
                if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
                  codePoint = tempCodePoint;
                }
              }
          }
        }

        if (codePoint === null) {
          // we did not generate a valid codePoint so insert a
          // replacement char (U+FFFD) and advance only 1 byte
          codePoint = 0xFFFD;
          bytesPerSequence = 1;
        } else if (codePoint > 0xFFFF) {
          // encode to utf16 (surrogate pair dance)
          codePoint -= 0x10000;
          res.push(codePoint >>> 10 & 0x3FF | 0xD800);
          codePoint = 0xDC00 | codePoint & 0x3FF;
        }

        res.push(codePoint);
        i += bytesPerSequence;
      }

      return decodeCodePointsArray(res)
    }

    // Based on http://stackoverflow.com/a/22747272/680742, the browser with
    // the lowest limit is Chrome, with 0x10000 args.
    // We go 1 magnitude less, for safety
    var MAX_ARGUMENTS_LENGTH = 0x1000;

    function decodeCodePointsArray (codePoints) {
      var len = codePoints.length;
      if (len <= MAX_ARGUMENTS_LENGTH) {
        return String.fromCharCode.apply(String, codePoints) // avoid extra slice()
      }

      // Decode in chunks to avoid "call stack size exceeded".
      var res = '';
      var i = 0;
      while (i < len) {
        res += String.fromCharCode.apply(
          String,
          codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH)
        );
      }
      return res
    }

    function asciiSlice (buf, start, end) {
      var ret = '';
      end = Math.min(buf.length, end);

      for (var i = start; i < end; ++i) {
        ret += String.fromCharCode(buf[i] & 0x7F);
      }
      return ret
    }

    function latin1Slice (buf, start, end) {
      var ret = '';
      end = Math.min(buf.length, end);

      for (var i = start; i < end; ++i) {
        ret += String.fromCharCode(buf[i]);
      }
      return ret
    }

    function hexSlice (buf, start, end) {
      var len = buf.length;

      if (!start || start < 0) start = 0;
      if (!end || end < 0 || end > len) end = len;

      var out = '';
      for (var i = start; i < end; ++i) {
        out += toHex(buf[i]);
      }
      return out
    }

    function utf16leSlice (buf, start, end) {
      var bytes = buf.slice(start, end);
      var res = '';
      for (var i = 0; i < bytes.length; i += 2) {
        res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
      }
      return res
    }

    Buffer.prototype.slice = function slice (start, end) {
      var len = this.length;
      start = ~~start;
      end = end === undefined ? len : ~~end;

      if (start < 0) {
        start += len;
        if (start < 0) start = 0;
      } else if (start > len) {
        start = len;
      }

      if (end < 0) {
        end += len;
        if (end < 0) end = 0;
      } else if (end > len) {
        end = len;
      }

      if (end < start) end = start;

      var newBuf;
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        newBuf = this.subarray(start, end);
        newBuf.__proto__ = Buffer.prototype;
      } else {
        var sliceLen = end - start;
        newBuf = new Buffer(sliceLen, undefined);
        for (var i = 0; i < sliceLen; ++i) {
          newBuf[i] = this[i + start];
        }
      }

      return newBuf
    };

    /*
     * Need to make sure that buffer isn't trying to write out of bounds.
     */
    function checkOffset (offset, ext, length) {
      if ((offset % 1) !== 0 || offset < 0) throw new RangeError('offset is not uint')
      if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length')
    }

    Buffer.prototype.readUIntLE = function readUIntLE (offset, byteLength, noAssert) {
      offset = offset | 0;
      byteLength = byteLength | 0;
      if (!noAssert) checkOffset(offset, byteLength, this.length);

      var val = this[offset];
      var mul = 1;
      var i = 0;
      while (++i < byteLength && (mul *= 0x100)) {
        val += this[offset + i] * mul;
      }

      return val
    };

    Buffer.prototype.readUIntBE = function readUIntBE (offset, byteLength, noAssert) {
      offset = offset | 0;
      byteLength = byteLength | 0;
      if (!noAssert) {
        checkOffset(offset, byteLength, this.length);
      }

      var val = this[offset + --byteLength];
      var mul = 1;
      while (byteLength > 0 && (mul *= 0x100)) {
        val += this[offset + --byteLength] * mul;
      }

      return val
    };

    Buffer.prototype.readUInt8 = function readUInt8 (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 1, this.length);
      return this[offset]
    };

    Buffer.prototype.readUInt16LE = function readUInt16LE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 2, this.length);
      return this[offset] | (this[offset + 1] << 8)
    };

    Buffer.prototype.readUInt16BE = function readUInt16BE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 2, this.length);
      return (this[offset] << 8) | this[offset + 1]
    };

    Buffer.prototype.readUInt32LE = function readUInt32LE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 4, this.length);

      return ((this[offset]) |
          (this[offset + 1] << 8) |
          (this[offset + 2] << 16)) +
          (this[offset + 3] * 0x1000000)
    };

    Buffer.prototype.readUInt32BE = function readUInt32BE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 4, this.length);

      return (this[offset] * 0x1000000) +
        ((this[offset + 1] << 16) |
        (this[offset + 2] << 8) |
        this[offset + 3])
    };

    Buffer.prototype.readIntLE = function readIntLE (offset, byteLength, noAssert) {
      offset = offset | 0;
      byteLength = byteLength | 0;
      if (!noAssert) checkOffset(offset, byteLength, this.length);

      var val = this[offset];
      var mul = 1;
      var i = 0;
      while (++i < byteLength && (mul *= 0x100)) {
        val += this[offset + i] * mul;
      }
      mul *= 0x80;

      if (val >= mul) val -= Math.pow(2, 8 * byteLength);

      return val
    };

    Buffer.prototype.readIntBE = function readIntBE (offset, byteLength, noAssert) {
      offset = offset | 0;
      byteLength = byteLength | 0;
      if (!noAssert) checkOffset(offset, byteLength, this.length);

      var i = byteLength;
      var mul = 1;
      var val = this[offset + --i];
      while (i > 0 && (mul *= 0x100)) {
        val += this[offset + --i] * mul;
      }
      mul *= 0x80;

      if (val >= mul) val -= Math.pow(2, 8 * byteLength);

      return val
    };

    Buffer.prototype.readInt8 = function readInt8 (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 1, this.length);
      if (!(this[offset] & 0x80)) return (this[offset])
      return ((0xff - this[offset] + 1) * -1)
    };

    Buffer.prototype.readInt16LE = function readInt16LE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 2, this.length);
      var val = this[offset] | (this[offset + 1] << 8);
      return (val & 0x8000) ? val | 0xFFFF0000 : val
    };

    Buffer.prototype.readInt16BE = function readInt16BE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 2, this.length);
      var val = this[offset + 1] | (this[offset] << 8);
      return (val & 0x8000) ? val | 0xFFFF0000 : val
    };

    Buffer.prototype.readInt32LE = function readInt32LE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 4, this.length);

      return (this[offset]) |
        (this[offset + 1] << 8) |
        (this[offset + 2] << 16) |
        (this[offset + 3] << 24)
    };

    Buffer.prototype.readInt32BE = function readInt32BE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 4, this.length);

      return (this[offset] << 24) |
        (this[offset + 1] << 16) |
        (this[offset + 2] << 8) |
        (this[offset + 3])
    };

    Buffer.prototype.readFloatLE = function readFloatLE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 4, this.length);
      return read(this, offset, true, 23, 4)
    };

    Buffer.prototype.readFloatBE = function readFloatBE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 4, this.length);
      return read(this, offset, false, 23, 4)
    };

    Buffer.prototype.readDoubleLE = function readDoubleLE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 8, this.length);
      return read(this, offset, true, 52, 8)
    };

    Buffer.prototype.readDoubleBE = function readDoubleBE (offset, noAssert) {
      if (!noAssert) checkOffset(offset, 8, this.length);
      return read(this, offset, false, 52, 8)
    };

    function checkInt (buf, value, offset, ext, max, min) {
      if (!internalIsBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance')
      if (value > max || value < min) throw new RangeError('"value" argument is out of bounds')
      if (offset + ext > buf.length) throw new RangeError('Index out of range')
    }

    Buffer.prototype.writeUIntLE = function writeUIntLE (value, offset, byteLength, noAssert) {
      value = +value;
      offset = offset | 0;
      byteLength = byteLength | 0;
      if (!noAssert) {
        var maxBytes = Math.pow(2, 8 * byteLength) - 1;
        checkInt(this, value, offset, byteLength, maxBytes, 0);
      }

      var mul = 1;
      var i = 0;
      this[offset] = value & 0xFF;
      while (++i < byteLength && (mul *= 0x100)) {
        this[offset + i] = (value / mul) & 0xFF;
      }

      return offset + byteLength
    };

    Buffer.prototype.writeUIntBE = function writeUIntBE (value, offset, byteLength, noAssert) {
      value = +value;
      offset = offset | 0;
      byteLength = byteLength | 0;
      if (!noAssert) {
        var maxBytes = Math.pow(2, 8 * byteLength) - 1;
        checkInt(this, value, offset, byteLength, maxBytes, 0);
      }

      var i = byteLength - 1;
      var mul = 1;
      this[offset + i] = value & 0xFF;
      while (--i >= 0 && (mul *= 0x100)) {
        this[offset + i] = (value / mul) & 0xFF;
      }

      return offset + byteLength
    };

    Buffer.prototype.writeUInt8 = function writeUInt8 (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0);
      if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value);
      this[offset] = (value & 0xff);
      return offset + 1
    };

    function objectWriteUInt16 (buf, value, offset, littleEndian) {
      if (value < 0) value = 0xffff + value + 1;
      for (var i = 0, j = Math.min(buf.length - offset, 2); i < j; ++i) {
        buf[offset + i] = (value & (0xff << (8 * (littleEndian ? i : 1 - i)))) >>>
          (littleEndian ? i : 1 - i) * 8;
      }
    }

    Buffer.prototype.writeUInt16LE = function writeUInt16LE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset] = (value & 0xff);
        this[offset + 1] = (value >>> 8);
      } else {
        objectWriteUInt16(this, value, offset, true);
      }
      return offset + 2
    };

    Buffer.prototype.writeUInt16BE = function writeUInt16BE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset] = (value >>> 8);
        this[offset + 1] = (value & 0xff);
      } else {
        objectWriteUInt16(this, value, offset, false);
      }
      return offset + 2
    };

    function objectWriteUInt32 (buf, value, offset, littleEndian) {
      if (value < 0) value = 0xffffffff + value + 1;
      for (var i = 0, j = Math.min(buf.length - offset, 4); i < j; ++i) {
        buf[offset + i] = (value >>> (littleEndian ? i : 3 - i) * 8) & 0xff;
      }
    }

    Buffer.prototype.writeUInt32LE = function writeUInt32LE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset + 3] = (value >>> 24);
        this[offset + 2] = (value >>> 16);
        this[offset + 1] = (value >>> 8);
        this[offset] = (value & 0xff);
      } else {
        objectWriteUInt32(this, value, offset, true);
      }
      return offset + 4
    };

    Buffer.prototype.writeUInt32BE = function writeUInt32BE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset] = (value >>> 24);
        this[offset + 1] = (value >>> 16);
        this[offset + 2] = (value >>> 8);
        this[offset + 3] = (value & 0xff);
      } else {
        objectWriteUInt32(this, value, offset, false);
      }
      return offset + 4
    };

    Buffer.prototype.writeIntLE = function writeIntLE (value, offset, byteLength, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) {
        var limit = Math.pow(2, 8 * byteLength - 1);

        checkInt(this, value, offset, byteLength, limit - 1, -limit);
      }

      var i = 0;
      var mul = 1;
      var sub = 0;
      this[offset] = value & 0xFF;
      while (++i < byteLength && (mul *= 0x100)) {
        if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
          sub = 1;
        }
        this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
      }

      return offset + byteLength
    };

    Buffer.prototype.writeIntBE = function writeIntBE (value, offset, byteLength, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) {
        var limit = Math.pow(2, 8 * byteLength - 1);

        checkInt(this, value, offset, byteLength, limit - 1, -limit);
      }

      var i = byteLength - 1;
      var mul = 1;
      var sub = 0;
      this[offset + i] = value & 0xFF;
      while (--i >= 0 && (mul *= 0x100)) {
        if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
          sub = 1;
        }
        this[offset + i] = ((value / mul) >> 0) - sub & 0xFF;
      }

      return offset + byteLength
    };

    Buffer.prototype.writeInt8 = function writeInt8 (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80);
      if (!Buffer.TYPED_ARRAY_SUPPORT) value = Math.floor(value);
      if (value < 0) value = 0xff + value + 1;
      this[offset] = (value & 0xff);
      return offset + 1
    };

    Buffer.prototype.writeInt16LE = function writeInt16LE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset] = (value & 0xff);
        this[offset + 1] = (value >>> 8);
      } else {
        objectWriteUInt16(this, value, offset, true);
      }
      return offset + 2
    };

    Buffer.prototype.writeInt16BE = function writeInt16BE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset] = (value >>> 8);
        this[offset + 1] = (value & 0xff);
      } else {
        objectWriteUInt16(this, value, offset, false);
      }
      return offset + 2
    };

    Buffer.prototype.writeInt32LE = function writeInt32LE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset] = (value & 0xff);
        this[offset + 1] = (value >>> 8);
        this[offset + 2] = (value >>> 16);
        this[offset + 3] = (value >>> 24);
      } else {
        objectWriteUInt32(this, value, offset, true);
      }
      return offset + 4
    };

    Buffer.prototype.writeInt32BE = function writeInt32BE (value, offset, noAssert) {
      value = +value;
      offset = offset | 0;
      if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
      if (value < 0) value = 0xffffffff + value + 1;
      if (Buffer.TYPED_ARRAY_SUPPORT) {
        this[offset] = (value >>> 24);
        this[offset + 1] = (value >>> 16);
        this[offset + 2] = (value >>> 8);
        this[offset + 3] = (value & 0xff);
      } else {
        objectWriteUInt32(this, value, offset, false);
      }
      return offset + 4
    };

    function checkIEEE754 (buf, value, offset, ext, max, min) {
      if (offset + ext > buf.length) throw new RangeError('Index out of range')
      if (offset < 0) throw new RangeError('Index out of range')
    }

    function writeFloat (buf, value, offset, littleEndian, noAssert) {
      if (!noAssert) {
        checkIEEE754(buf, value, offset, 4);
      }
      write(buf, value, offset, littleEndian, 23, 4);
      return offset + 4
    }

    Buffer.prototype.writeFloatLE = function writeFloatLE (value, offset, noAssert) {
      return writeFloat(this, value, offset, true, noAssert)
    };

    Buffer.prototype.writeFloatBE = function writeFloatBE (value, offset, noAssert) {
      return writeFloat(this, value, offset, false, noAssert)
    };

    function writeDouble (buf, value, offset, littleEndian, noAssert) {
      if (!noAssert) {
        checkIEEE754(buf, value, offset, 8);
      }
      write(buf, value, offset, littleEndian, 52, 8);
      return offset + 8
    }

    Buffer.prototype.writeDoubleLE = function writeDoubleLE (value, offset, noAssert) {
      return writeDouble(this, value, offset, true, noAssert)
    };

    Buffer.prototype.writeDoubleBE = function writeDoubleBE (value, offset, noAssert) {
      return writeDouble(this, value, offset, false, noAssert)
    };

    // copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
    Buffer.prototype.copy = function copy (target, targetStart, start, end) {
      if (!start) start = 0;
      if (!end && end !== 0) end = this.length;
      if (targetStart >= target.length) targetStart = target.length;
      if (!targetStart) targetStart = 0;
      if (end > 0 && end < start) end = start;

      // Copy 0 bytes; we're done
      if (end === start) return 0
      if (target.length === 0 || this.length === 0) return 0

      // Fatal error conditions
      if (targetStart < 0) {
        throw new RangeError('targetStart out of bounds')
      }
      if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds')
      if (end < 0) throw new RangeError('sourceEnd out of bounds')

      // Are we oob?
      if (end > this.length) end = this.length;
      if (target.length - targetStart < end - start) {
        end = target.length - targetStart + start;
      }

      var len = end - start;
      var i;

      if (this === target && start < targetStart && targetStart < end) {
        // descending copy from end
        for (i = len - 1; i >= 0; --i) {
          target[i + targetStart] = this[i + start];
        }
      } else if (len < 1000 || !Buffer.TYPED_ARRAY_SUPPORT) {
        // ascending copy from start
        for (i = 0; i < len; ++i) {
          target[i + targetStart] = this[i + start];
        }
      } else {
        Uint8Array.prototype.set.call(
          target,
          this.subarray(start, start + len),
          targetStart
        );
      }

      return len
    };

    // Usage:
    //    buffer.fill(number[, offset[, end]])
    //    buffer.fill(buffer[, offset[, end]])
    //    buffer.fill(string[, offset[, end]][, encoding])
    Buffer.prototype.fill = function fill (val, start, end, encoding) {
      // Handle string cases:
      if (typeof val === 'string') {
        if (typeof start === 'string') {
          encoding = start;
          start = 0;
          end = this.length;
        } else if (typeof end === 'string') {
          encoding = end;
          end = this.length;
        }
        if (val.length === 1) {
          var code = val.charCodeAt(0);
          if (code < 256) {
            val = code;
          }
        }
        if (encoding !== undefined && typeof encoding !== 'string') {
          throw new TypeError('encoding must be a string')
        }
        if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
          throw new TypeError('Unknown encoding: ' + encoding)
        }
      } else if (typeof val === 'number') {
        val = val & 255;
      }

      // Invalid ranges are not set to a default, so can range check early.
      if (start < 0 || this.length < start || this.length < end) {
        throw new RangeError('Out of range index')
      }

      if (end <= start) {
        return this
      }

      start = start >>> 0;
      end = end === undefined ? this.length : end >>> 0;

      if (!val) val = 0;

      var i;
      if (typeof val === 'number') {
        for (i = start; i < end; ++i) {
          this[i] = val;
        }
      } else {
        var bytes = internalIsBuffer(val)
          ? val
          : utf8ToBytes(new Buffer(val, encoding).toString());
        var len = bytes.length;
        for (i = 0; i < end - start; ++i) {
          this[i + start] = bytes[i % len];
        }
      }

      return this
    };

    // HELPER FUNCTIONS
    // ================

    var INVALID_BASE64_RE = /[^+\/0-9A-Za-z-_]/g;

    function base64clean (str) {
      // Node strips out invalid characters like \n and \t from the string, base64-js does not
      str = stringtrim(str).replace(INVALID_BASE64_RE, '');
      // Node converts strings with length < 2 to ''
      if (str.length < 2) return ''
      // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
      while (str.length % 4 !== 0) {
        str = str + '=';
      }
      return str
    }

    function stringtrim (str) {
      if (str.trim) return str.trim()
      return str.replace(/^\s+|\s+$/g, '')
    }

    function toHex (n) {
      if (n < 16) return '0' + n.toString(16)
      return n.toString(16)
    }

    function utf8ToBytes (string, units) {
      units = units || Infinity;
      var codePoint;
      var length = string.length;
      var leadSurrogate = null;
      var bytes = [];

      for (var i = 0; i < length; ++i) {
        codePoint = string.charCodeAt(i);

        // is surrogate component
        if (codePoint > 0xD7FF && codePoint < 0xE000) {
          // last char was a lead
          if (!leadSurrogate) {
            // no lead yet
            if (codePoint > 0xDBFF) {
              // unexpected trail
              if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
              continue
            } else if (i + 1 === length) {
              // unpaired lead
              if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
              continue
            }

            // valid lead
            leadSurrogate = codePoint;

            continue
          }

          // 2 leads in a row
          if (codePoint < 0xDC00) {
            if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
            leadSurrogate = codePoint;
            continue
          }

          // valid surrogate pair
          codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000;
        } else if (leadSurrogate) {
          // valid bmp char, but last char was a lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
        }

        leadSurrogate = null;

        // encode utf8
        if (codePoint < 0x80) {
          if ((units -= 1) < 0) break
          bytes.push(codePoint);
        } else if (codePoint < 0x800) {
          if ((units -= 2) < 0) break
          bytes.push(
            codePoint >> 0x6 | 0xC0,
            codePoint & 0x3F | 0x80
          );
        } else if (codePoint < 0x10000) {
          if ((units -= 3) < 0) break
          bytes.push(
            codePoint >> 0xC | 0xE0,
            codePoint >> 0x6 & 0x3F | 0x80,
            codePoint & 0x3F | 0x80
          );
        } else if (codePoint < 0x110000) {
          if ((units -= 4) < 0) break
          bytes.push(
            codePoint >> 0x12 | 0xF0,
            codePoint >> 0xC & 0x3F | 0x80,
            codePoint >> 0x6 & 0x3F | 0x80,
            codePoint & 0x3F | 0x80
          );
        } else {
          throw new Error('Invalid code point')
        }
      }

      return bytes
    }

    function asciiToBytes (str) {
      var byteArray = [];
      for (var i = 0; i < str.length; ++i) {
        // Node's code seems to be doing this and not & 0x7F..
        byteArray.push(str.charCodeAt(i) & 0xFF);
      }
      return byteArray
    }

    function utf16leToBytes (str, units) {
      var c, hi, lo;
      var byteArray = [];
      for (var i = 0; i < str.length; ++i) {
        if ((units -= 2) < 0) break

        c = str.charCodeAt(i);
        hi = c >> 8;
        lo = c % 256;
        byteArray.push(lo);
        byteArray.push(hi);
      }

      return byteArray
    }


    function base64ToBytes (str) {
      return toByteArray(base64clean(str))
    }

    function blitBuffer (src, dst, offset, length) {
      for (var i = 0; i < length; ++i) {
        if ((i + offset >= dst.length) || (i >= src.length)) break
        dst[i + offset] = src[i];
      }
      return i
    }

    function isnan (val) {
      return val !== val // eslint-disable-line no-self-compare
    }


    // the following is from is-buffer, also by Feross Aboukhadijeh and with same lisence
    // The _isBuffer check is for Safari 5-7 support, because it's missing
    // Object.prototype.constructor. Remove this eventually
    function isBuffer(obj) {
      return obj != null && (!!obj._isBuffer || isFastBuffer(obj) || isSlowBuffer(obj))
    }

    function isFastBuffer (obj) {
      return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
    }

    // For Node v0.10 support. Remove this eventually.
    function isSlowBuffer (obj) {
      return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isFastBuffer(obj.slice(0, 0))
    }

    var domain;

    // This constructor is used to store event handlers. Instantiating this is
    // faster than explicitly calling `Object.create(null)` to get a "clean" empty
    // object (tested with v8 v4.9).
    function EventHandlers() {}
    EventHandlers.prototype = Object.create(null);

    function EventEmitter() {
      EventEmitter.init.call(this);
    }

    // nodejs oddity
    // require('events') === require('events').EventEmitter
    EventEmitter.EventEmitter = EventEmitter;

    EventEmitter.usingDomains = false;

    EventEmitter.prototype.domain = undefined;
    EventEmitter.prototype._events = undefined;
    EventEmitter.prototype._maxListeners = undefined;

    // By default EventEmitters will print a warning if more than 10 listeners are
    // added to it. This is a useful default which helps finding memory leaks.
    EventEmitter.defaultMaxListeners = 10;

    EventEmitter.init = function() {
      this.domain = null;
      if (EventEmitter.usingDomains) {
        // if there is an active domain, then attach to it.
        if (domain.active ) ;
      }

      if (!this._events || this._events === Object.getPrototypeOf(this)._events) {
        this._events = new EventHandlers();
        this._eventsCount = 0;
      }

      this._maxListeners = this._maxListeners || undefined;
    };

    // Obviously not all Emitters should be limited to 10. This function allows
    // that to be increased. Set to zero for unlimited.
    EventEmitter.prototype.setMaxListeners = function setMaxListeners(n) {
      if (typeof n !== 'number' || n < 0 || isNaN(n))
        throw new TypeError('"n" argument must be a positive number');
      this._maxListeners = n;
      return this;
    };

    function $getMaxListeners(that) {
      if (that._maxListeners === undefined)
        return EventEmitter.defaultMaxListeners;
      return that._maxListeners;
    }

    EventEmitter.prototype.getMaxListeners = function getMaxListeners() {
      return $getMaxListeners(this);
    };

    // These standalone emit* functions are used to optimize calling of event
    // handlers for fast cases because emit() itself often has a variable number of
    // arguments and can be deoptimized because of that. These functions always have
    // the same number of arguments and thus do not get deoptimized, so the code
    // inside them can execute faster.
    function emitNone(handler, isFn, self) {
      if (isFn)
        handler.call(self);
      else {
        var len = handler.length;
        var listeners = arrayClone(handler, len);
        for (var i = 0; i < len; ++i)
          listeners[i].call(self);
      }
    }
    function emitOne(handler, isFn, self, arg1) {
      if (isFn)
        handler.call(self, arg1);
      else {
        var len = handler.length;
        var listeners = arrayClone(handler, len);
        for (var i = 0; i < len; ++i)
          listeners[i].call(self, arg1);
      }
    }
    function emitTwo(handler, isFn, self, arg1, arg2) {
      if (isFn)
        handler.call(self, arg1, arg2);
      else {
        var len = handler.length;
        var listeners = arrayClone(handler, len);
        for (var i = 0; i < len; ++i)
          listeners[i].call(self, arg1, arg2);
      }
    }
    function emitThree(handler, isFn, self, arg1, arg2, arg3) {
      if (isFn)
        handler.call(self, arg1, arg2, arg3);
      else {
        var len = handler.length;
        var listeners = arrayClone(handler, len);
        for (var i = 0; i < len; ++i)
          listeners[i].call(self, arg1, arg2, arg3);
      }
    }

    function emitMany(handler, isFn, self, args) {
      if (isFn)
        handler.apply(self, args);
      else {
        var len = handler.length;
        var listeners = arrayClone(handler, len);
        for (var i = 0; i < len; ++i)
          listeners[i].apply(self, args);
      }
    }

    EventEmitter.prototype.emit = function emit(type) {
      var er, handler, len, args, i, events, domain;
      var doError = (type === 'error');

      events = this._events;
      if (events)
        doError = (doError && events.error == null);
      else if (!doError)
        return false;

      domain = this.domain;

      // If there is no 'error' event listener then throw.
      if (doError) {
        er = arguments[1];
        if (domain) {
          if (!er)
            er = new Error('Uncaught, unspecified "error" event');
          er.domainEmitter = this;
          er.domain = domain;
          er.domainThrown = false;
          domain.emit('error', er);
        } else if (er instanceof Error) {
          throw er; // Unhandled 'error' event
        } else {
          // At least give some kind of context to the user
          var err = new Error('Uncaught, unspecified "error" event. (' + er + ')');
          err.context = er;
          throw err;
        }
        return false;
      }

      handler = events[type];

      if (!handler)
        return false;

      var isFn = typeof handler === 'function';
      len = arguments.length;
      switch (len) {
        // fast cases
        case 1:
          emitNone(handler, isFn, this);
          break;
        case 2:
          emitOne(handler, isFn, this, arguments[1]);
          break;
        case 3:
          emitTwo(handler, isFn, this, arguments[1], arguments[2]);
          break;
        case 4:
          emitThree(handler, isFn, this, arguments[1], arguments[2], arguments[3]);
          break;
        // slower
        default:
          args = new Array(len - 1);
          for (i = 1; i < len; i++)
            args[i - 1] = arguments[i];
          emitMany(handler, isFn, this, args);
      }

      return true;
    };

    function _addListener(target, type, listener, prepend) {
      var m;
      var events;
      var existing;

      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');

      events = target._events;
      if (!events) {
        events = target._events = new EventHandlers();
        target._eventsCount = 0;
      } else {
        // To avoid recursion in the case that type === "newListener"! Before
        // adding it to the listeners, first emit "newListener".
        if (events.newListener) {
          target.emit('newListener', type,
                      listener.listener ? listener.listener : listener);

          // Re-assign `events` because a newListener handler could have caused the
          // this._events to be assigned to a new object
          events = target._events;
        }
        existing = events[type];
      }

      if (!existing) {
        // Optimize the case of one listener. Don't need the extra array object.
        existing = events[type] = listener;
        ++target._eventsCount;
      } else {
        if (typeof existing === 'function') {
          // Adding the second element, need to change to array.
          existing = events[type] = prepend ? [listener, existing] :
                                              [existing, listener];
        } else {
          // If we've already got an array, just append.
          if (prepend) {
            existing.unshift(listener);
          } else {
            existing.push(listener);
          }
        }

        // Check for listener leak
        if (!existing.warned) {
          m = $getMaxListeners(target);
          if (m && m > 0 && existing.length > m) {
            existing.warned = true;
            var w = new Error('Possible EventEmitter memory leak detected. ' +
                                existing.length + ' ' + type + ' listeners added. ' +
                                'Use emitter.setMaxListeners() to increase limit');
            w.name = 'MaxListenersExceededWarning';
            w.emitter = target;
            w.type = type;
            w.count = existing.length;
            emitWarning(w);
          }
        }
      }

      return target;
    }
    function emitWarning(e) {
      typeof console.warn === 'function' ? console.warn(e) : console.log(e);
    }
    EventEmitter.prototype.addListener = function addListener(type, listener) {
      return _addListener(this, type, listener, false);
    };

    EventEmitter.prototype.on = EventEmitter.prototype.addListener;

    EventEmitter.prototype.prependListener =
        function prependListener(type, listener) {
          return _addListener(this, type, listener, true);
        };

    function _onceWrap(target, type, listener) {
      var fired = false;
      function g() {
        target.removeListener(type, g);
        if (!fired) {
          fired = true;
          listener.apply(target, arguments);
        }
      }
      g.listener = listener;
      return g;
    }

    EventEmitter.prototype.once = function once(type, listener) {
      if (typeof listener !== 'function')
        throw new TypeError('"listener" argument must be a function');
      this.on(type, _onceWrap(this, type, listener));
      return this;
    };

    EventEmitter.prototype.prependOnceListener =
        function prependOnceListener(type, listener) {
          if (typeof listener !== 'function')
            throw new TypeError('"listener" argument must be a function');
          this.prependListener(type, _onceWrap(this, type, listener));
          return this;
        };

    // emits a 'removeListener' event iff the listener was removed
    EventEmitter.prototype.removeListener =
        function removeListener(type, listener) {
          var list, events, position, i, originalListener;

          if (typeof listener !== 'function')
            throw new TypeError('"listener" argument must be a function');

          events = this._events;
          if (!events)
            return this;

          list = events[type];
          if (!list)
            return this;

          if (list === listener || (list.listener && list.listener === listener)) {
            if (--this._eventsCount === 0)
              this._events = new EventHandlers();
            else {
              delete events[type];
              if (events.removeListener)
                this.emit('removeListener', type, list.listener || listener);
            }
          } else if (typeof list !== 'function') {
            position = -1;

            for (i = list.length; i-- > 0;) {
              if (list[i] === listener ||
                  (list[i].listener && list[i].listener === listener)) {
                originalListener = list[i].listener;
                position = i;
                break;
              }
            }

            if (position < 0)
              return this;

            if (list.length === 1) {
              list[0] = undefined;
              if (--this._eventsCount === 0) {
                this._events = new EventHandlers();
                return this;
              } else {
                delete events[type];
              }
            } else {
              spliceOne(list, position);
            }

            if (events.removeListener)
              this.emit('removeListener', type, originalListener || listener);
          }

          return this;
        };

    EventEmitter.prototype.removeAllListeners =
        function removeAllListeners(type) {
          var listeners, events;

          events = this._events;
          if (!events)
            return this;

          // not listening for removeListener, no need to emit
          if (!events.removeListener) {
            if (arguments.length === 0) {
              this._events = new EventHandlers();
              this._eventsCount = 0;
            } else if (events[type]) {
              if (--this._eventsCount === 0)
                this._events = new EventHandlers();
              else
                delete events[type];
            }
            return this;
          }

          // emit removeListener for all listeners on all events
          if (arguments.length === 0) {
            var keys = Object.keys(events);
            for (var i = 0, key; i < keys.length; ++i) {
              key = keys[i];
              if (key === 'removeListener') continue;
              this.removeAllListeners(key);
            }
            this.removeAllListeners('removeListener');
            this._events = new EventHandlers();
            this._eventsCount = 0;
            return this;
          }

          listeners = events[type];

          if (typeof listeners === 'function') {
            this.removeListener(type, listeners);
          } else if (listeners) {
            // LIFO order
            do {
              this.removeListener(type, listeners[listeners.length - 1]);
            } while (listeners[0]);
          }

          return this;
        };

    EventEmitter.prototype.listeners = function listeners(type) {
      var evlistener;
      var ret;
      var events = this._events;

      if (!events)
        ret = [];
      else {
        evlistener = events[type];
        if (!evlistener)
          ret = [];
        else if (typeof evlistener === 'function')
          ret = [evlistener.listener || evlistener];
        else
          ret = unwrapListeners(evlistener);
      }

      return ret;
    };

    EventEmitter.listenerCount = function(emitter, type) {
      if (typeof emitter.listenerCount === 'function') {
        return emitter.listenerCount(type);
      } else {
        return listenerCount.call(emitter, type);
      }
    };

    EventEmitter.prototype.listenerCount = listenerCount;
    function listenerCount(type) {
      var events = this._events;

      if (events) {
        var evlistener = events[type];

        if (typeof evlistener === 'function') {
          return 1;
        } else if (evlistener) {
          return evlistener.length;
        }
      }

      return 0;
    }

    EventEmitter.prototype.eventNames = function eventNames() {
      return this._eventsCount > 0 ? Reflect.ownKeys(this._events) : [];
    };

    // About 1.5x faster than the two-arg version of Array#splice().
    function spliceOne(list, index) {
      for (var i = index, k = i + 1, n = list.length; k < n; i += 1, k += 1)
        list[i] = list[k];
      list.pop();
    }

    function arrayClone(arr, i) {
      var copy = new Array(i);
      while (i--)
        copy[i] = arr[i];
      return copy;
    }

    function unwrapListeners(arr) {
      var ret = new Array(arr.length);
      for (var i = 0; i < ret.length; ++i) {
        ret[i] = arr[i].listener || arr[i];
      }
      return ret;
    }

    // shim for using process in browser
    // based off https://github.com/defunctzombie/node-process/blob/master/browser.js

    function defaultSetTimout() {
        throw new Error('setTimeout has not been defined');
    }
    function defaultClearTimeout () {
        throw new Error('clearTimeout has not been defined');
    }
    var cachedSetTimeout = defaultSetTimout;
    var cachedClearTimeout = defaultClearTimeout;
    if (typeof global$1.setTimeout === 'function') {
        cachedSetTimeout = setTimeout;
    }
    if (typeof global$1.clearTimeout === 'function') {
        cachedClearTimeout = clearTimeout;
    }

    function runTimeout(fun) {
        if (cachedSetTimeout === setTimeout) {
            //normal enviroments in sane situations
            return setTimeout(fun, 0);
        }
        // if setTimeout wasn't available but was latter defined
        if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
            cachedSetTimeout = setTimeout;
            return setTimeout(fun, 0);
        }
        try {
            // when when somebody has screwed with setTimeout but no I.E. maddness
            return cachedSetTimeout(fun, 0);
        } catch(e){
            try {
                // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
                return cachedSetTimeout.call(null, fun, 0);
            } catch(e){
                // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
                return cachedSetTimeout.call(this, fun, 0);
            }
        }


    }
    function runClearTimeout(marker) {
        if (cachedClearTimeout === clearTimeout) {
            //normal enviroments in sane situations
            return clearTimeout(marker);
        }
        // if clearTimeout wasn't available but was latter defined
        if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
            cachedClearTimeout = clearTimeout;
            return clearTimeout(marker);
        }
        try {
            // when when somebody has screwed with setTimeout but no I.E. maddness
            return cachedClearTimeout(marker);
        } catch (e){
            try {
                // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
                return cachedClearTimeout.call(null, marker);
            } catch (e){
                // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
                // Some versions of I.E. have different rules for clearTimeout vs setTimeout
                return cachedClearTimeout.call(this, marker);
            }
        }



    }
    var queue = [];
    var draining = false;
    var currentQueue;
    var queueIndex = -1;

    function cleanUpNextTick() {
        if (!draining || !currentQueue) {
            return;
        }
        draining = false;
        if (currentQueue.length) {
            queue = currentQueue.concat(queue);
        } else {
            queueIndex = -1;
        }
        if (queue.length) {
            drainQueue();
        }
    }

    function drainQueue() {
        if (draining) {
            return;
        }
        var timeout = runTimeout(cleanUpNextTick);
        draining = true;

        var len = queue.length;
        while(len) {
            currentQueue = queue;
            queue = [];
            while (++queueIndex < len) {
                if (currentQueue) {
                    currentQueue[queueIndex].run();
                }
            }
            queueIndex = -1;
            len = queue.length;
        }
        currentQueue = null;
        draining = false;
        runClearTimeout(timeout);
    }
    function nextTick(fun) {
        var args = new Array(arguments.length - 1);
        if (arguments.length > 1) {
            for (var i = 1; i < arguments.length; i++) {
                args[i - 1] = arguments[i];
            }
        }
        queue.push(new Item(fun, args));
        if (queue.length === 1 && !draining) {
            runTimeout(drainQueue);
        }
    }
    // v8 likes predictible objects
    function Item(fun, array) {
        this.fun = fun;
        this.array = array;
    }
    Item.prototype.run = function () {
        this.fun.apply(null, this.array);
    };

    // from https://github.com/kumavis/browser-process-hrtime/blob/master/index.js
    var performance = global$1.performance || {};
    var performanceNow =
      performance.now        ||
      performance.mozNow     ||
      performance.msNow      ||
      performance.oNow       ||
      performance.webkitNow  ||
      function(){ return (new Date()).getTime() };

    var inherits;
    if (typeof Object.create === 'function'){
      inherits = function inherits(ctor, superCtor) {
        // implementation from standard node.js 'util' module
        ctor.super_ = superCtor;
        ctor.prototype = Object.create(superCtor.prototype, {
          constructor: {
            value: ctor,
            enumerable: false,
            writable: true,
            configurable: true
          }
        });
      };
    } else {
      inherits = function inherits(ctor, superCtor) {
        ctor.super_ = superCtor;
        var TempCtor = function () {};
        TempCtor.prototype = superCtor.prototype;
        ctor.prototype = new TempCtor();
        ctor.prototype.constructor = ctor;
      };
    }
    var inherits$1 = inherits;

    var formatRegExp = /%[sdj%]/g;
    function format(f) {
      if (!isString(f)) {
        var objects = [];
        for (var i = 0; i < arguments.length; i++) {
          objects.push(inspect(arguments[i]));
        }
        return objects.join(' ');
      }

      var i = 1;
      var args = arguments;
      var len = args.length;
      var str = String(f).replace(formatRegExp, function(x) {
        if (x === '%%') return '%';
        if (i >= len) return x;
        switch (x) {
          case '%s': return String(args[i++]);
          case '%d': return Number(args[i++]);
          case '%j':
            try {
              return JSON.stringify(args[i++]);
            } catch (_) {
              return '[Circular]';
            }
          default:
            return x;
        }
      });
      for (var x = args[i]; i < len; x = args[++i]) {
        if (isNull(x) || !isObject(x)) {
          str += ' ' + x;
        } else {
          str += ' ' + inspect(x);
        }
      }
      return str;
    }

    // Mark that a method should not be used.
    // Returns a modified function which warns once by default.
    // If --no-deprecation is set, then it is a no-op.
    function deprecate(fn, msg) {
      // Allow for deprecating things in the process of starting up.
      if (isUndefined(global$1.process)) {
        return function() {
          return deprecate(fn, msg).apply(this, arguments);
        };
      }

      var warned = false;
      function deprecated() {
        if (!warned) {
          {
            console.error(msg);
          }
          warned = true;
        }
        return fn.apply(this, arguments);
      }

      return deprecated;
    }

    var debugs = {};
    var debugEnviron;
    function debuglog(set) {
      if (isUndefined(debugEnviron))
        debugEnviron =  '';
      set = set.toUpperCase();
      if (!debugs[set]) {
        if (new RegExp('\\b' + set + '\\b', 'i').test(debugEnviron)) {
          var pid = 0;
          debugs[set] = function() {
            var msg = format.apply(null, arguments);
            console.error('%s %d: %s', set, pid, msg);
          };
        } else {
          debugs[set] = function() {};
        }
      }
      return debugs[set];
    }

    /**
     * Echos the value of a value. Trys to print the value out
     * in the best way possible given the different types.
     *
     * @param {Object} obj The object to print out.
     * @param {Object} opts Optional options object that alters the output.
     */
    /* legacy: obj, showHidden, depth, colors*/
    function inspect(obj, opts) {
      // default options
      var ctx = {
        seen: [],
        stylize: stylizeNoColor
      };
      // legacy...
      if (arguments.length >= 3) ctx.depth = arguments[2];
      if (arguments.length >= 4) ctx.colors = arguments[3];
      if (isBoolean(opts)) {
        // legacy...
        ctx.showHidden = opts;
      } else if (opts) {
        // got an "options" object
        _extend(ctx, opts);
      }
      // set default options
      if (isUndefined(ctx.showHidden)) ctx.showHidden = false;
      if (isUndefined(ctx.depth)) ctx.depth = 2;
      if (isUndefined(ctx.colors)) ctx.colors = false;
      if (isUndefined(ctx.customInspect)) ctx.customInspect = true;
      if (ctx.colors) ctx.stylize = stylizeWithColor;
      return formatValue(ctx, obj, ctx.depth);
    }

    // http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
    inspect.colors = {
      'bold' : [1, 22],
      'italic' : [3, 23],
      'underline' : [4, 24],
      'inverse' : [7, 27],
      'white' : [37, 39],
      'grey' : [90, 39],
      'black' : [30, 39],
      'blue' : [34, 39],
      'cyan' : [36, 39],
      'green' : [32, 39],
      'magenta' : [35, 39],
      'red' : [31, 39],
      'yellow' : [33, 39]
    };

    // Don't use 'blue' not visible on cmd.exe
    inspect.styles = {
      'special': 'cyan',
      'number': 'yellow',
      'boolean': 'yellow',
      'undefined': 'grey',
      'null': 'bold',
      'string': 'green',
      'date': 'magenta',
      // "name": intentionally not styling
      'regexp': 'red'
    };


    function stylizeWithColor(str, styleType) {
      var style = inspect.styles[styleType];

      if (style) {
        return '\u001b[' + inspect.colors[style][0] + 'm' + str +
               '\u001b[' + inspect.colors[style][1] + 'm';
      } else {
        return str;
      }
    }


    function stylizeNoColor(str, styleType) {
      return str;
    }


    function arrayToHash(array) {
      var hash = {};

      array.forEach(function(val, idx) {
        hash[val] = true;
      });

      return hash;
    }


    function formatValue(ctx, value, recurseTimes) {
      // Provide a hook for user-specified inspect functions.
      // Check that value is an object with an inspect function on it
      if (ctx.customInspect &&
          value &&
          isFunction(value.inspect) &&
          // Filter out the util module, it's inspect function is special
          value.inspect !== inspect &&
          // Also filter out any prototype objects using the circular check.
          !(value.constructor && value.constructor.prototype === value)) {
        var ret = value.inspect(recurseTimes, ctx);
        if (!isString(ret)) {
          ret = formatValue(ctx, ret, recurseTimes);
        }
        return ret;
      }

      // Primitive types cannot have properties
      var primitive = formatPrimitive(ctx, value);
      if (primitive) {
        return primitive;
      }

      // Look up the keys of the object.
      var keys = Object.keys(value);
      var visibleKeys = arrayToHash(keys);

      if (ctx.showHidden) {
        keys = Object.getOwnPropertyNames(value);
      }

      // IE doesn't make error fields non-enumerable
      // http://msdn.microsoft.com/en-us/library/ie/dww52sbt(v=vs.94).aspx
      if (isError(value)
          && (keys.indexOf('message') >= 0 || keys.indexOf('description') >= 0)) {
        return formatError(value);
      }

      // Some type of object without properties can be shortcutted.
      if (keys.length === 0) {
        if (isFunction(value)) {
          var name = value.name ? ': ' + value.name : '';
          return ctx.stylize('[Function' + name + ']', 'special');
        }
        if (isRegExp(value)) {
          return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
        }
        if (isDate(value)) {
          return ctx.stylize(Date.prototype.toString.call(value), 'date');
        }
        if (isError(value)) {
          return formatError(value);
        }
      }

      var base = '', array = false, braces = ['{', '}'];

      // Make Array say that they are Array
      if (isArray$1(value)) {
        array = true;
        braces = ['[', ']'];
      }

      // Make functions say that they are functions
      if (isFunction(value)) {
        var n = value.name ? ': ' + value.name : '';
        base = ' [Function' + n + ']';
      }

      // Make RegExps say that they are RegExps
      if (isRegExp(value)) {
        base = ' ' + RegExp.prototype.toString.call(value);
      }

      // Make dates with properties first say the date
      if (isDate(value)) {
        base = ' ' + Date.prototype.toUTCString.call(value);
      }

      // Make error with message first say the error
      if (isError(value)) {
        base = ' ' + formatError(value);
      }

      if (keys.length === 0 && (!array || value.length == 0)) {
        return braces[0] + base + braces[1];
      }

      if (recurseTimes < 0) {
        if (isRegExp(value)) {
          return ctx.stylize(RegExp.prototype.toString.call(value), 'regexp');
        } else {
          return ctx.stylize('[Object]', 'special');
        }
      }

      ctx.seen.push(value);

      var output;
      if (array) {
        output = formatArray(ctx, value, recurseTimes, visibleKeys, keys);
      } else {
        output = keys.map(function(key) {
          return formatProperty(ctx, value, recurseTimes, visibleKeys, key, array);
        });
      }

      ctx.seen.pop();

      return reduceToSingleString(output, base, braces);
    }


    function formatPrimitive(ctx, value) {
      if (isUndefined(value))
        return ctx.stylize('undefined', 'undefined');
      if (isString(value)) {
        var simple = '\'' + JSON.stringify(value).replace(/^"|"$/g, '')
                                                 .replace(/'/g, "\\'")
                                                 .replace(/\\"/g, '"') + '\'';
        return ctx.stylize(simple, 'string');
      }
      if (isNumber(value))
        return ctx.stylize('' + value, 'number');
      if (isBoolean(value))
        return ctx.stylize('' + value, 'boolean');
      // For some reason typeof null is "object", so special case here.
      if (isNull(value))
        return ctx.stylize('null', 'null');
    }


    function formatError(value) {
      return '[' + Error.prototype.toString.call(value) + ']';
    }


    function formatArray(ctx, value, recurseTimes, visibleKeys, keys) {
      var output = [];
      for (var i = 0, l = value.length; i < l; ++i) {
        if (hasOwnProperty(value, String(i))) {
          output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
              String(i), true));
        } else {
          output.push('');
        }
      }
      keys.forEach(function(key) {
        if (!key.match(/^\d+$/)) {
          output.push(formatProperty(ctx, value, recurseTimes, visibleKeys,
              key, true));
        }
      });
      return output;
    }


    function formatProperty(ctx, value, recurseTimes, visibleKeys, key, array) {
      var name, str, desc;
      desc = Object.getOwnPropertyDescriptor(value, key) || { value: value[key] };
      if (desc.get) {
        if (desc.set) {
          str = ctx.stylize('[Getter/Setter]', 'special');
        } else {
          str = ctx.stylize('[Getter]', 'special');
        }
      } else {
        if (desc.set) {
          str = ctx.stylize('[Setter]', 'special');
        }
      }
      if (!hasOwnProperty(visibleKeys, key)) {
        name = '[' + key + ']';
      }
      if (!str) {
        if (ctx.seen.indexOf(desc.value) < 0) {
          if (isNull(recurseTimes)) {
            str = formatValue(ctx, desc.value, null);
          } else {
            str = formatValue(ctx, desc.value, recurseTimes - 1);
          }
          if (str.indexOf('\n') > -1) {
            if (array) {
              str = str.split('\n').map(function(line) {
                return '  ' + line;
              }).join('\n').substr(2);
            } else {
              str = '\n' + str.split('\n').map(function(line) {
                return '   ' + line;
              }).join('\n');
            }
          }
        } else {
          str = ctx.stylize('[Circular]', 'special');
        }
      }
      if (isUndefined(name)) {
        if (array && key.match(/^\d+$/)) {
          return str;
        }
        name = JSON.stringify('' + key);
        if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
          name = name.substr(1, name.length - 2);
          name = ctx.stylize(name, 'name');
        } else {
          name = name.replace(/'/g, "\\'")
                     .replace(/\\"/g, '"')
                     .replace(/(^"|"$)/g, "'");
          name = ctx.stylize(name, 'string');
        }
      }

      return name + ': ' + str;
    }


    function reduceToSingleString(output, base, braces) {
      var length = output.reduce(function(prev, cur) {
        if (cur.indexOf('\n') >= 0) ;
        return prev + cur.replace(/\u001b\[\d\d?m/g, '').length + 1;
      }, 0);

      if (length > 60) {
        return braces[0] +
               (base === '' ? '' : base + '\n ') +
               ' ' +
               output.join(',\n  ') +
               ' ' +
               braces[1];
      }

      return braces[0] + base + ' ' + output.join(', ') + ' ' + braces[1];
    }


    // NOTE: These type checking functions intentionally don't use `instanceof`
    // because it is fragile and can be easily faked with `Object.create()`.
    function isArray$1(ar) {
      return Array.isArray(ar);
    }

    function isBoolean(arg) {
      return typeof arg === 'boolean';
    }

    function isNull(arg) {
      return arg === null;
    }

    function isNumber(arg) {
      return typeof arg === 'number';
    }

    function isString(arg) {
      return typeof arg === 'string';
    }

    function isUndefined(arg) {
      return arg === void 0;
    }

    function isRegExp(re) {
      return isObject(re) && objectToString(re) === '[object RegExp]';
    }

    function isObject(arg) {
      return typeof arg === 'object' && arg !== null;
    }

    function isDate(d) {
      return isObject(d) && objectToString(d) === '[object Date]';
    }

    function isError(e) {
      return isObject(e) &&
          (objectToString(e) === '[object Error]' || e instanceof Error);
    }

    function isFunction(arg) {
      return typeof arg === 'function';
    }

    function objectToString(o) {
      return Object.prototype.toString.call(o);
    }

    function _extend(origin, add) {
      // Don't do anything if add isn't an object
      if (!add || !isObject(add)) return origin;

      var keys = Object.keys(add);
      var i = keys.length;
      while (i--) {
        origin[keys[i]] = add[keys[i]];
      }
      return origin;
    }
    function hasOwnProperty(obj, prop) {
      return Object.prototype.hasOwnProperty.call(obj, prop);
    }

    function BufferList() {
      this.head = null;
      this.tail = null;
      this.length = 0;
    }

    BufferList.prototype.push = function (v) {
      var entry = { data: v, next: null };
      if (this.length > 0) this.tail.next = entry;else this.head = entry;
      this.tail = entry;
      ++this.length;
    };

    BufferList.prototype.unshift = function (v) {
      var entry = { data: v, next: this.head };
      if (this.length === 0) this.tail = entry;
      this.head = entry;
      ++this.length;
    };

    BufferList.prototype.shift = function () {
      if (this.length === 0) return;
      var ret = this.head.data;
      if (this.length === 1) this.head = this.tail = null;else this.head = this.head.next;
      --this.length;
      return ret;
    };

    BufferList.prototype.clear = function () {
      this.head = this.tail = null;
      this.length = 0;
    };

    BufferList.prototype.join = function (s) {
      if (this.length === 0) return '';
      var p = this.head;
      var ret = '' + p.data;
      while (p = p.next) {
        ret += s + p.data;
      }return ret;
    };

    BufferList.prototype.concat = function (n) {
      if (this.length === 0) return Buffer.alloc(0);
      if (this.length === 1) return this.head.data;
      var ret = Buffer.allocUnsafe(n >>> 0);
      var p = this.head;
      var i = 0;
      while (p) {
        p.data.copy(ret, i);
        i += p.data.length;
        p = p.next;
      }
      return ret;
    };

    // Copyright Joyent, Inc. and other Node contributors.
    var isBufferEncoding = Buffer.isEncoding
      || function(encoding) {
           switch (encoding && encoding.toLowerCase()) {
             case 'hex': case 'utf8': case 'utf-8': case 'ascii': case 'binary': case 'base64': case 'ucs2': case 'ucs-2': case 'utf16le': case 'utf-16le': case 'raw': return true;
             default: return false;
           }
         };


    function assertEncoding(encoding) {
      if (encoding && !isBufferEncoding(encoding)) {
        throw new Error('Unknown encoding: ' + encoding);
      }
    }

    // StringDecoder provides an interface for efficiently splitting a series of
    // buffers into a series of JS strings without breaking apart multi-byte
    // characters. CESU-8 is handled as part of the UTF-8 encoding.
    //
    // @TODO Handling all encodings inside a single object makes it very difficult
    // to reason about this code, so it should be split up in the future.
    // @TODO There should be a utf8-strict encoding that rejects invalid UTF-8 code
    // points as used by CESU-8.
    function StringDecoder(encoding) {
      this.encoding = (encoding || 'utf8').toLowerCase().replace(/[-_]/, '');
      assertEncoding(encoding);
      switch (this.encoding) {
        case 'utf8':
          // CESU-8 represents each of Surrogate Pair by 3-bytes
          this.surrogateSize = 3;
          break;
        case 'ucs2':
        case 'utf16le':
          // UTF-16 represents each of Surrogate Pair by 2-bytes
          this.surrogateSize = 2;
          this.detectIncompleteChar = utf16DetectIncompleteChar;
          break;
        case 'base64':
          // Base-64 stores 3 bytes in 4 chars, and pads the remainder.
          this.surrogateSize = 3;
          this.detectIncompleteChar = base64DetectIncompleteChar;
          break;
        default:
          this.write = passThroughWrite;
          return;
      }

      // Enough space to store all bytes of a single character. UTF-8 needs 4
      // bytes, but CESU-8 may require up to 6 (3 bytes per surrogate).
      this.charBuffer = new Buffer(6);
      // Number of bytes received for the current incomplete multi-byte character.
      this.charReceived = 0;
      // Number of bytes expected for the current incomplete multi-byte character.
      this.charLength = 0;
    }

    // write decodes the given buffer and returns it as JS string that is
    // guaranteed to not contain any partial multi-byte characters. Any partial
    // character found at the end of the buffer is buffered up, and will be
    // returned when calling write again with the remaining bytes.
    //
    // Note: Converting a Buffer containing an orphan surrogate to a String
    // currently works, but converting a String to a Buffer (via `new Buffer`, or
    // Buffer#write) will replace incomplete surrogates with the unicode
    // replacement character. See https://codereview.chromium.org/121173009/ .
    StringDecoder.prototype.write = function(buffer) {
      var charStr = '';
      // if our last write ended with an incomplete multibyte character
      while (this.charLength) {
        // determine how many remaining bytes this buffer has to offer for this char
        var available = (buffer.length >= this.charLength - this.charReceived) ?
            this.charLength - this.charReceived :
            buffer.length;

        // add the new bytes to the char buffer
        buffer.copy(this.charBuffer, this.charReceived, 0, available);
        this.charReceived += available;

        if (this.charReceived < this.charLength) {
          // still not enough chars in this buffer? wait for more ...
          return '';
        }

        // remove bytes belonging to the current character from the buffer
        buffer = buffer.slice(available, buffer.length);

        // get the character that was split
        charStr = this.charBuffer.slice(0, this.charLength).toString(this.encoding);

        // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
        var charCode = charStr.charCodeAt(charStr.length - 1);
        if (charCode >= 0xD800 && charCode <= 0xDBFF) {
          this.charLength += this.surrogateSize;
          charStr = '';
          continue;
        }
        this.charReceived = this.charLength = 0;

        // if there are no more bytes in this buffer, just emit our char
        if (buffer.length === 0) {
          return charStr;
        }
        break;
      }

      // determine and set charLength / charReceived
      this.detectIncompleteChar(buffer);

      var end = buffer.length;
      if (this.charLength) {
        // buffer the incomplete character bytes we got
        buffer.copy(this.charBuffer, 0, buffer.length - this.charReceived, end);
        end -= this.charReceived;
      }

      charStr += buffer.toString(this.encoding, 0, end);

      var end = charStr.length - 1;
      var charCode = charStr.charCodeAt(end);
      // CESU-8: lead surrogate (D800-DBFF) is also the incomplete character
      if (charCode >= 0xD800 && charCode <= 0xDBFF) {
        var size = this.surrogateSize;
        this.charLength += size;
        this.charReceived += size;
        this.charBuffer.copy(this.charBuffer, size, 0, size);
        buffer.copy(this.charBuffer, 0, 0, size);
        return charStr.substring(0, end);
      }

      // or just emit the charStr
      return charStr;
    };

    // detectIncompleteChar determines if there is an incomplete UTF-8 character at
    // the end of the given buffer. If so, it sets this.charLength to the byte
    // length that character, and sets this.charReceived to the number of bytes
    // that are available for this character.
    StringDecoder.prototype.detectIncompleteChar = function(buffer) {
      // determine how many bytes we have to check at the end of this buffer
      var i = (buffer.length >= 3) ? 3 : buffer.length;

      // Figure out if one of the last i bytes of our buffer announces an
      // incomplete char.
      for (; i > 0; i--) {
        var c = buffer[buffer.length - i];

        // See http://en.wikipedia.org/wiki/UTF-8#Description

        // 110XXXXX
        if (i == 1 && c >> 5 == 0x06) {
          this.charLength = 2;
          break;
        }

        // 1110XXXX
        if (i <= 2 && c >> 4 == 0x0E) {
          this.charLength = 3;
          break;
        }

        // 11110XXX
        if (i <= 3 && c >> 3 == 0x1E) {
          this.charLength = 4;
          break;
        }
      }
      this.charReceived = i;
    };

    StringDecoder.prototype.end = function(buffer) {
      var res = '';
      if (buffer && buffer.length)
        res = this.write(buffer);

      if (this.charReceived) {
        var cr = this.charReceived;
        var buf = this.charBuffer;
        var enc = this.encoding;
        res += buf.slice(0, cr).toString(enc);
      }

      return res;
    };

    function passThroughWrite(buffer) {
      return buffer.toString(this.encoding);
    }

    function utf16DetectIncompleteChar(buffer) {
      this.charReceived = buffer.length % 2;
      this.charLength = this.charReceived ? 2 : 0;
    }

    function base64DetectIncompleteChar(buffer) {
      this.charReceived = buffer.length % 3;
      this.charLength = this.charReceived ? 3 : 0;
    }

    Readable.ReadableState = ReadableState;

    var debug = debuglog('stream');
    inherits$1(Readable, EventEmitter);

    function prependListener(emitter, event, fn) {
      // Sadly this is not cacheable as some libraries bundle their own
      // event emitter implementation with them.
      if (typeof emitter.prependListener === 'function') {
        return emitter.prependListener(event, fn);
      } else {
        // This is a hack to make sure that our error handler is attached before any
        // userland ones.  NEVER DO THIS. This is here only because this code needs
        // to continue to work with older versions of Node.js that do not include
        // the prependListener() method. The goal is to eventually remove this hack.
        if (!emitter._events || !emitter._events[event])
          emitter.on(event, fn);
        else if (Array.isArray(emitter._events[event]))
          emitter._events[event].unshift(fn);
        else
          emitter._events[event] = [fn, emitter._events[event]];
      }
    }
    function listenerCount$1 (emitter, type) {
      return emitter.listeners(type).length;
    }
    function ReadableState(options, stream) {

      options = options || {};

      // object stream flag. Used to make read(n) ignore n and to
      // make all the buffer merging and length checks go away
      this.objectMode = !!options.objectMode;

      if (stream instanceof Duplex) this.objectMode = this.objectMode || !!options.readableObjectMode;

      // the point at which it stops calling _read() to fill the buffer
      // Note: 0 is a valid value, means "don't call _read preemptively ever"
      var hwm = options.highWaterMark;
      var defaultHwm = this.objectMode ? 16 : 16 * 1024;
      this.highWaterMark = hwm || hwm === 0 ? hwm : defaultHwm;

      // cast to ints.
      this.highWaterMark = ~ ~this.highWaterMark;

      // A linked list is used to store data chunks instead of an array because the
      // linked list can remove elements from the beginning faster than
      // array.shift()
      this.buffer = new BufferList();
      this.length = 0;
      this.pipes = null;
      this.pipesCount = 0;
      this.flowing = null;
      this.ended = false;
      this.endEmitted = false;
      this.reading = false;

      // a flag to be able to tell if the onwrite cb is called immediately,
      // or on a later tick.  We set this to true at first, because any
      // actions that shouldn't happen until "later" should generally also
      // not happen before the first write call.
      this.sync = true;

      // whenever we return null, then we set a flag to say
      // that we're awaiting a 'readable' event emission.
      this.needReadable = false;
      this.emittedReadable = false;
      this.readableListening = false;
      this.resumeScheduled = false;

      // Crypto is kind of old and crusty.  Historically, its default string
      // encoding is 'binary' so we have to make this configurable.
      // Everything else in the universe uses 'utf8', though.
      this.defaultEncoding = options.defaultEncoding || 'utf8';

      // when piping, we only care about 'readable' events that happen
      // after read()ing all the bytes and not getting any pushback.
      this.ranOut = false;

      // the number of writers that are awaiting a drain event in .pipe()s
      this.awaitDrain = 0;

      // if true, a maybeReadMore has been scheduled
      this.readingMore = false;

      this.decoder = null;
      this.encoding = null;
      if (options.encoding) {
        this.decoder = new StringDecoder(options.encoding);
        this.encoding = options.encoding;
      }
    }
    function Readable(options) {

      if (!(this instanceof Readable)) return new Readable(options);

      this._readableState = new ReadableState(options, this);

      // legacy
      this.readable = true;

      if (options && typeof options.read === 'function') this._read = options.read;

      EventEmitter.call(this);
    }

    // Manually shove something into the read() buffer.
    // This returns true if the highWaterMark has not been hit yet,
    // similar to how Writable.write() returns true if you should
    // write() some more.
    Readable.prototype.push = function (chunk, encoding) {
      var state = this._readableState;

      if (!state.objectMode && typeof chunk === 'string') {
        encoding = encoding || state.defaultEncoding;
        if (encoding !== state.encoding) {
          chunk = Buffer.from(chunk, encoding);
          encoding = '';
        }
      }

      return readableAddChunk(this, state, chunk, encoding, false);
    };

    // Unshift should *always* be something directly out of read()
    Readable.prototype.unshift = function (chunk) {
      var state = this._readableState;
      return readableAddChunk(this, state, chunk, '', true);
    };

    Readable.prototype.isPaused = function () {
      return this._readableState.flowing === false;
    };

    function readableAddChunk(stream, state, chunk, encoding, addToFront) {
      var er = chunkInvalid(state, chunk);
      if (er) {
        stream.emit('error', er);
      } else if (chunk === null) {
        state.reading = false;
        onEofChunk(stream, state);
      } else if (state.objectMode || chunk && chunk.length > 0) {
        if (state.ended && !addToFront) {
          var e = new Error('stream.push() after EOF');
          stream.emit('error', e);
        } else if (state.endEmitted && addToFront) {
          var _e = new Error('stream.unshift() after end event');
          stream.emit('error', _e);
        } else {
          var skipAdd;
          if (state.decoder && !addToFront && !encoding) {
            chunk = state.decoder.write(chunk);
            skipAdd = !state.objectMode && chunk.length === 0;
          }

          if (!addToFront) state.reading = false;

          // Don't add to the buffer if we've decoded to an empty string chunk and
          // we're not in object mode
          if (!skipAdd) {
            // if we want the data now, just emit it.
            if (state.flowing && state.length === 0 && !state.sync) {
              stream.emit('data', chunk);
              stream.read(0);
            } else {
              // update the buffer info.
              state.length += state.objectMode ? 1 : chunk.length;
              if (addToFront) state.buffer.unshift(chunk);else state.buffer.push(chunk);

              if (state.needReadable) emitReadable(stream);
            }
          }

          maybeReadMore(stream, state);
        }
      } else if (!addToFront) {
        state.reading = false;
      }

      return needMoreData(state);
    }

    // if it's past the high water mark, we can push in some more.
    // Also, if we have no data yet, we can stand some
    // more bytes.  This is to work around cases where hwm=0,
    // such as the repl.  Also, if the push() triggered a
    // readable event, and the user called read(largeNumber) such that
    // needReadable was set, then we ought to push more, so that another
    // 'readable' event will be triggered.
    function needMoreData(state) {
      return !state.ended && (state.needReadable || state.length < state.highWaterMark || state.length === 0);
    }

    // backwards compatibility.
    Readable.prototype.setEncoding = function (enc) {
      this._readableState.decoder = new StringDecoder(enc);
      this._readableState.encoding = enc;
      return this;
    };

    // Don't raise the hwm > 8MB
    var MAX_HWM = 0x800000;
    function computeNewHighWaterMark(n) {
      if (n >= MAX_HWM) {
        n = MAX_HWM;
      } else {
        // Get the next highest power of 2 to prevent increasing hwm excessively in
        // tiny amounts
        n--;
        n |= n >>> 1;
        n |= n >>> 2;
        n |= n >>> 4;
        n |= n >>> 8;
        n |= n >>> 16;
        n++;
      }
      return n;
    }

    // This function is designed to be inlinable, so please take care when making
    // changes to the function body.
    function howMuchToRead(n, state) {
      if (n <= 0 || state.length === 0 && state.ended) return 0;
      if (state.objectMode) return 1;
      if (n !== n) {
        // Only flow one buffer at a time
        if (state.flowing && state.length) return state.buffer.head.data.length;else return state.length;
      }
      // If we're asking for more than the current hwm, then raise the hwm.
      if (n > state.highWaterMark) state.highWaterMark = computeNewHighWaterMark(n);
      if (n <= state.length) return n;
      // Don't have enough
      if (!state.ended) {
        state.needReadable = true;
        return 0;
      }
      return state.length;
    }

    // you can override either this method, or the async _read(n) below.
    Readable.prototype.read = function (n) {
      debug('read', n);
      n = parseInt(n, 10);
      var state = this._readableState;
      var nOrig = n;

      if (n !== 0) state.emittedReadable = false;

      // if we're doing read(0) to trigger a readable event, but we
      // already have a bunch of data in the buffer, then just trigger
      // the 'readable' event and move on.
      if (n === 0 && state.needReadable && (state.length >= state.highWaterMark || state.ended)) {
        debug('read: emitReadable', state.length, state.ended);
        if (state.length === 0 && state.ended) endReadable(this);else emitReadable(this);
        return null;
      }

      n = howMuchToRead(n, state);

      // if we've ended, and we're now clear, then finish it up.
      if (n === 0 && state.ended) {
        if (state.length === 0) endReadable(this);
        return null;
      }

      // All the actual chunk generation logic needs to be
      // *below* the call to _read.  The reason is that in certain
      // synthetic stream cases, such as passthrough streams, _read
      // may be a completely synchronous operation which may change
      // the state of the read buffer, providing enough data when
      // before there was *not* enough.
      //
      // So, the steps are:
      // 1. Figure out what the state of things will be after we do
      // a read from the buffer.
      //
      // 2. If that resulting state will trigger a _read, then call _read.
      // Note that this may be asynchronous, or synchronous.  Yes, it is
      // deeply ugly to write APIs this way, but that still doesn't mean
      // that the Readable class should behave improperly, as streams are
      // designed to be sync/async agnostic.
      // Take note if the _read call is sync or async (ie, if the read call
      // has returned yet), so that we know whether or not it's safe to emit
      // 'readable' etc.
      //
      // 3. Actually pull the requested chunks out of the buffer and return.

      // if we need a readable event, then we need to do some reading.
      var doRead = state.needReadable;
      debug('need readable', doRead);

      // if we currently have less than the highWaterMark, then also read some
      if (state.length === 0 || state.length - n < state.highWaterMark) {
        doRead = true;
        debug('length less than watermark', doRead);
      }

      // however, if we've ended, then there's no point, and if we're already
      // reading, then it's unnecessary.
      if (state.ended || state.reading) {
        doRead = false;
        debug('reading or ended', doRead);
      } else if (doRead) {
        debug('do read');
        state.reading = true;
        state.sync = true;
        // if the length is currently zero, then we *need* a readable event.
        if (state.length === 0) state.needReadable = true;
        // call internal read method
        this._read(state.highWaterMark);
        state.sync = false;
        // If _read pushed data synchronously, then `reading` will be false,
        // and we need to re-evaluate how much data we can return to the user.
        if (!state.reading) n = howMuchToRead(nOrig, state);
      }

      var ret;
      if (n > 0) ret = fromList(n, state);else ret = null;

      if (ret === null) {
        state.needReadable = true;
        n = 0;
      } else {
        state.length -= n;
      }

      if (state.length === 0) {
        // If we have nothing in the buffer, then we want to know
        // as soon as we *do* get something into the buffer.
        if (!state.ended) state.needReadable = true;

        // If we tried to read() past the EOF, then emit end on the next tick.
        if (nOrig !== n && state.ended) endReadable(this);
      }

      if (ret !== null) this.emit('data', ret);

      return ret;
    };

    function chunkInvalid(state, chunk) {
      var er = null;
      if (!isBuffer(chunk) && typeof chunk !== 'string' && chunk !== null && chunk !== undefined && !state.objectMode) {
        er = new TypeError('Invalid non-string/buffer chunk');
      }
      return er;
    }

    function onEofChunk(stream, state) {
      if (state.ended) return;
      if (state.decoder) {
        var chunk = state.decoder.end();
        if (chunk && chunk.length) {
          state.buffer.push(chunk);
          state.length += state.objectMode ? 1 : chunk.length;
        }
      }
      state.ended = true;

      // emit 'readable' now to make sure it gets picked up.
      emitReadable(stream);
    }

    // Don't emit readable right away in sync mode, because this can trigger
    // another read() call => stack overflow.  This way, it might trigger
    // a nextTick recursion warning, but that's not so bad.
    function emitReadable(stream) {
      var state = stream._readableState;
      state.needReadable = false;
      if (!state.emittedReadable) {
        debug('emitReadable', state.flowing);
        state.emittedReadable = true;
        if (state.sync) nextTick(emitReadable_, stream);else emitReadable_(stream);
      }
    }

    function emitReadable_(stream) {
      debug('emit readable');
      stream.emit('readable');
      flow(stream);
    }

    // at this point, the user has presumably seen the 'readable' event,
    // and called read() to consume some data.  that may have triggered
    // in turn another _read(n) call, in which case reading = true if
    // it's in progress.
    // However, if we're not ended, or reading, and the length < hwm,
    // then go ahead and try to read some more preemptively.
    function maybeReadMore(stream, state) {
      if (!state.readingMore) {
        state.readingMore = true;
        nextTick(maybeReadMore_, stream, state);
      }
    }

    function maybeReadMore_(stream, state) {
      var len = state.length;
      while (!state.reading && !state.flowing && !state.ended && state.length < state.highWaterMark) {
        debug('maybeReadMore read 0');
        stream.read(0);
        if (len === state.length)
          // didn't get any data, stop spinning.
          break;else len = state.length;
      }
      state.readingMore = false;
    }

    // abstract method.  to be overridden in specific implementation classes.
    // call cb(er, data) where data is <= n in length.
    // for virtual (non-string, non-buffer) streams, "length" is somewhat
    // arbitrary, and perhaps not very meaningful.
    Readable.prototype._read = function (n) {
      this.emit('error', new Error('not implemented'));
    };

    Readable.prototype.pipe = function (dest, pipeOpts) {
      var src = this;
      var state = this._readableState;

      switch (state.pipesCount) {
        case 0:
          state.pipes = dest;
          break;
        case 1:
          state.pipes = [state.pipes, dest];
          break;
        default:
          state.pipes.push(dest);
          break;
      }
      state.pipesCount += 1;
      debug('pipe count=%d opts=%j', state.pipesCount, pipeOpts);

      var doEnd = (!pipeOpts || pipeOpts.end !== false);

      var endFn = doEnd ? onend : cleanup;
      if (state.endEmitted) nextTick(endFn);else src.once('end', endFn);

      dest.on('unpipe', onunpipe);
      function onunpipe(readable) {
        debug('onunpipe');
        if (readable === src) {
          cleanup();
        }
      }

      function onend() {
        debug('onend');
        dest.end();
      }

      // when the dest drains, it reduces the awaitDrain counter
      // on the source.  This would be more elegant with a .once()
      // handler in flow(), but adding and removing repeatedly is
      // too slow.
      var ondrain = pipeOnDrain(src);
      dest.on('drain', ondrain);

      var cleanedUp = false;
      function cleanup() {
        debug('cleanup');
        // cleanup event handlers once the pipe is broken
        dest.removeListener('close', onclose);
        dest.removeListener('finish', onfinish);
        dest.removeListener('drain', ondrain);
        dest.removeListener('error', onerror);
        dest.removeListener('unpipe', onunpipe);
        src.removeListener('end', onend);
        src.removeListener('end', cleanup);
        src.removeListener('data', ondata);

        cleanedUp = true;

        // if the reader is waiting for a drain event from this
        // specific writer, then it would cause it to never start
        // flowing again.
        // So, if this is awaiting a drain, then we just call it now.
        // If we don't know, then assume that we are waiting for one.
        if (state.awaitDrain && (!dest._writableState || dest._writableState.needDrain)) ondrain();
      }

      // If the user pushes more data while we're writing to dest then we'll end up
      // in ondata again. However, we only want to increase awaitDrain once because
      // dest will only emit one 'drain' event for the multiple writes.
      // => Introduce a guard on increasing awaitDrain.
      var increasedAwaitDrain = false;
      src.on('data', ondata);
      function ondata(chunk) {
        debug('ondata');
        increasedAwaitDrain = false;
        var ret = dest.write(chunk);
        if (false === ret && !increasedAwaitDrain) {
          // If the user unpiped during `dest.write()`, it is possible
          // to get stuck in a permanently paused state if that write
          // also returned false.
          // => Check whether `dest` is still a piping destination.
          if ((state.pipesCount === 1 && state.pipes === dest || state.pipesCount > 1 && indexOf(state.pipes, dest) !== -1) && !cleanedUp) {
            debug('false write response, pause', src._readableState.awaitDrain);
            src._readableState.awaitDrain++;
            increasedAwaitDrain = true;
          }
          src.pause();
        }
      }

      // if the dest has an error, then stop piping into it.
      // however, don't suppress the throwing behavior for this.
      function onerror(er) {
        debug('onerror', er);
        unpipe();
        dest.removeListener('error', onerror);
        if (listenerCount$1(dest, 'error') === 0) dest.emit('error', er);
      }

      // Make sure our error handler is attached before userland ones.
      prependListener(dest, 'error', onerror);

      // Both close and finish should trigger unpipe, but only once.
      function onclose() {
        dest.removeListener('finish', onfinish);
        unpipe();
      }
      dest.once('close', onclose);
      function onfinish() {
        debug('onfinish');
        dest.removeListener('close', onclose);
        unpipe();
      }
      dest.once('finish', onfinish);

      function unpipe() {
        debug('unpipe');
        src.unpipe(dest);
      }

      // tell the dest that it's being piped to
      dest.emit('pipe', src);

      // start the flow if it hasn't been started already.
      if (!state.flowing) {
        debug('pipe resume');
        src.resume();
      }

      return dest;
    };

    function pipeOnDrain(src) {
      return function () {
        var state = src._readableState;
        debug('pipeOnDrain', state.awaitDrain);
        if (state.awaitDrain) state.awaitDrain--;
        if (state.awaitDrain === 0 && src.listeners('data').length) {
          state.flowing = true;
          flow(src);
        }
      };
    }

    Readable.prototype.unpipe = function (dest) {
      var state = this._readableState;

      // if we're not piping anywhere, then do nothing.
      if (state.pipesCount === 0) return this;

      // just one destination.  most common case.
      if (state.pipesCount === 1) {
        // passed in one, but it's not the right one.
        if (dest && dest !== state.pipes) return this;

        if (!dest) dest = state.pipes;

        // got a match.
        state.pipes = null;
        state.pipesCount = 0;
        state.flowing = false;
        if (dest) dest.emit('unpipe', this);
        return this;
      }

      // slow case. multiple pipe destinations.

      if (!dest) {
        // remove all.
        var dests = state.pipes;
        var len = state.pipesCount;
        state.pipes = null;
        state.pipesCount = 0;
        state.flowing = false;

        for (var _i = 0; _i < len; _i++) {
          dests[_i].emit('unpipe', this);
        }return this;
      }

      // try to find the right one.
      var i = indexOf(state.pipes, dest);
      if (i === -1) return this;

      state.pipes.splice(i, 1);
      state.pipesCount -= 1;
      if (state.pipesCount === 1) state.pipes = state.pipes[0];

      dest.emit('unpipe', this);

      return this;
    };

    // set up data events if they are asked for
    // Ensure readable listeners eventually get something
    Readable.prototype.on = function (ev, fn) {
      var res = EventEmitter.prototype.on.call(this, ev, fn);

      if (ev === 'data') {
        // Start flowing on next tick if stream isn't explicitly paused
        if (this._readableState.flowing !== false) this.resume();
      } else if (ev === 'readable') {
        var state = this._readableState;
        if (!state.endEmitted && !state.readableListening) {
          state.readableListening = state.needReadable = true;
          state.emittedReadable = false;
          if (!state.reading) {
            nextTick(nReadingNextTick, this);
          } else if (state.length) {
            emitReadable(this);
          }
        }
      }

      return res;
    };
    Readable.prototype.addListener = Readable.prototype.on;

    function nReadingNextTick(self) {
      debug('readable nexttick read 0');
      self.read(0);
    }

    // pause() and resume() are remnants of the legacy readable stream API
    // If the user uses them, then switch into old mode.
    Readable.prototype.resume = function () {
      var state = this._readableState;
      if (!state.flowing) {
        debug('resume');
        state.flowing = true;
        resume(this, state);
      }
      return this;
    };

    function resume(stream, state) {
      if (!state.resumeScheduled) {
        state.resumeScheduled = true;
        nextTick(resume_, stream, state);
      }
    }

    function resume_(stream, state) {
      if (!state.reading) {
        debug('resume read 0');
        stream.read(0);
      }

      state.resumeScheduled = false;
      state.awaitDrain = 0;
      stream.emit('resume');
      flow(stream);
      if (state.flowing && !state.reading) stream.read(0);
    }

    Readable.prototype.pause = function () {
      debug('call pause flowing=%j', this._readableState.flowing);
      if (false !== this._readableState.flowing) {
        debug('pause');
        this._readableState.flowing = false;
        this.emit('pause');
      }
      return this;
    };

    function flow(stream) {
      var state = stream._readableState;
      debug('flow', state.flowing);
      while (state.flowing && stream.read() !== null) {}
    }

    // wrap an old-style stream as the async data source.
    // This is *not* part of the readable stream interface.
    // It is an ugly unfortunate mess of history.
    Readable.prototype.wrap = function (stream) {
      var state = this._readableState;
      var paused = false;

      var self = this;
      stream.on('end', function () {
        debug('wrapped end');
        if (state.decoder && !state.ended) {
          var chunk = state.decoder.end();
          if (chunk && chunk.length) self.push(chunk);
        }

        self.push(null);
      });

      stream.on('data', function (chunk) {
        debug('wrapped data');
        if (state.decoder) chunk = state.decoder.write(chunk);

        // don't skip over falsy values in objectMode
        if (state.objectMode && (chunk === null || chunk === undefined)) return;else if (!state.objectMode && (!chunk || !chunk.length)) return;

        var ret = self.push(chunk);
        if (!ret) {
          paused = true;
          stream.pause();
        }
      });

      // proxy all the other methods.
      // important when wrapping filters and duplexes.
      for (var i in stream) {
        if (this[i] === undefined && typeof stream[i] === 'function') {
          this[i] = function (method) {
            return function () {
              return stream[method].apply(stream, arguments);
            };
          }(i);
        }
      }

      // proxy certain important events.
      var events = ['error', 'close', 'destroy', 'pause', 'resume'];
      forEach(events, function (ev) {
        stream.on(ev, self.emit.bind(self, ev));
      });

      // when we try to consume some more bytes, simply unpause the
      // underlying stream.
      self._read = function (n) {
        debug('wrapped _read', n);
        if (paused) {
          paused = false;
          stream.resume();
        }
      };

      return self;
    };

    // exposed for testing purposes only.
    Readable._fromList = fromList;

    // Pluck off n bytes from an array of buffers.
    // Length is the combined lengths of all the buffers in the list.
    // This function is designed to be inlinable, so please take care when making
    // changes to the function body.
    function fromList(n, state) {
      // nothing buffered
      if (state.length === 0) return null;

      var ret;
      if (state.objectMode) ret = state.buffer.shift();else if (!n || n >= state.length) {
        // read it all, truncate the list
        if (state.decoder) ret = state.buffer.join('');else if (state.buffer.length === 1) ret = state.buffer.head.data;else ret = state.buffer.concat(state.length);
        state.buffer.clear();
      } else {
        // read part of list
        ret = fromListPartial(n, state.buffer, state.decoder);
      }

      return ret;
    }

    // Extracts only enough buffered data to satisfy the amount requested.
    // This function is designed to be inlinable, so please take care when making
    // changes to the function body.
    function fromListPartial(n, list, hasStrings) {
      var ret;
      if (n < list.head.data.length) {
        // slice is the same for buffers and strings
        ret = list.head.data.slice(0, n);
        list.head.data = list.head.data.slice(n);
      } else if (n === list.head.data.length) {
        // first chunk is a perfect match
        ret = list.shift();
      } else {
        // result spans more than one buffer
        ret = hasStrings ? copyFromBufferString(n, list) : copyFromBuffer(n, list);
      }
      return ret;
    }

    // Copies a specified amount of characters from the list of buffered data
    // chunks.
    // This function is designed to be inlinable, so please take care when making
    // changes to the function body.
    function copyFromBufferString(n, list) {
      var p = list.head;
      var c = 1;
      var ret = p.data;
      n -= ret.length;
      while (p = p.next) {
        var str = p.data;
        var nb = n > str.length ? str.length : n;
        if (nb === str.length) ret += str;else ret += str.slice(0, n);
        n -= nb;
        if (n === 0) {
          if (nb === str.length) {
            ++c;
            if (p.next) list.head = p.next;else list.head = list.tail = null;
          } else {
            list.head = p;
            p.data = str.slice(nb);
          }
          break;
        }
        ++c;
      }
      list.length -= c;
      return ret;
    }

    // Copies a specified amount of bytes from the list of buffered data chunks.
    // This function is designed to be inlinable, so please take care when making
    // changes to the function body.
    function copyFromBuffer(n, list) {
      var ret = Buffer.allocUnsafe(n);
      var p = list.head;
      var c = 1;
      p.data.copy(ret);
      n -= p.data.length;
      while (p = p.next) {
        var buf = p.data;
        var nb = n > buf.length ? buf.length : n;
        buf.copy(ret, ret.length - n, 0, nb);
        n -= nb;
        if (n === 0) {
          if (nb === buf.length) {
            ++c;
            if (p.next) list.head = p.next;else list.head = list.tail = null;
          } else {
            list.head = p;
            p.data = buf.slice(nb);
          }
          break;
        }
        ++c;
      }
      list.length -= c;
      return ret;
    }

    function endReadable(stream) {
      var state = stream._readableState;

      // If we get here before consuming all the bytes, then that is a
      // bug in node.  Should never happen.
      if (state.length > 0) throw new Error('"endReadable()" called on non-empty stream');

      if (!state.endEmitted) {
        state.ended = true;
        nextTick(endReadableNT, state, stream);
      }
    }

    function endReadableNT(state, stream) {
      // Check that we didn't get one last unshift.
      if (!state.endEmitted && state.length === 0) {
        state.endEmitted = true;
        stream.readable = false;
        stream.emit('end');
      }
    }

    function forEach(xs, f) {
      for (var i = 0, l = xs.length; i < l; i++) {
        f(xs[i], i);
      }
    }

    function indexOf(xs, x) {
      for (var i = 0, l = xs.length; i < l; i++) {
        if (xs[i] === x) return i;
      }
      return -1;
    }

    // A bit simpler than readable streams.
    Writable.WritableState = WritableState;
    inherits$1(Writable, EventEmitter);

    function nop() {}

    function WriteReq(chunk, encoding, cb) {
      this.chunk = chunk;
      this.encoding = encoding;
      this.callback = cb;
      this.next = null;
    }

    function WritableState(options, stream) {
      Object.defineProperty(this, 'buffer', {
        get: deprecate(function () {
          return this.getBuffer();
        }, '_writableState.buffer is deprecated. Use _writableState.getBuffer ' + 'instead.')
      });
      options = options || {};

      // object stream flag to indicate whether or not this stream
      // contains buffers or objects.
      this.objectMode = !!options.objectMode;

      if (stream instanceof Duplex) this.objectMode = this.objectMode || !!options.writableObjectMode;

      // the point at which write() starts returning false
      // Note: 0 is a valid value, means that we always return false if
      // the entire buffer is not flushed immediately on write()
      var hwm = options.highWaterMark;
      var defaultHwm = this.objectMode ? 16 : 16 * 1024;
      this.highWaterMark = hwm || hwm === 0 ? hwm : defaultHwm;

      // cast to ints.
      this.highWaterMark = ~ ~this.highWaterMark;

      this.needDrain = false;
      // at the start of calling end()
      this.ending = false;
      // when end() has been called, and returned
      this.ended = false;
      // when 'finish' is emitted
      this.finished = false;

      // should we decode strings into buffers before passing to _write?
      // this is here so that some node-core streams can optimize string
      // handling at a lower level.
      var noDecode = options.decodeStrings === false;
      this.decodeStrings = !noDecode;

      // Crypto is kind of old and crusty.  Historically, its default string
      // encoding is 'binary' so we have to make this configurable.
      // Everything else in the universe uses 'utf8', though.
      this.defaultEncoding = options.defaultEncoding || 'utf8';

      // not an actual buffer we keep track of, but a measurement
      // of how much we're waiting to get pushed to some underlying
      // socket or file.
      this.length = 0;

      // a flag to see when we're in the middle of a write.
      this.writing = false;

      // when true all writes will be buffered until .uncork() call
      this.corked = 0;

      // a flag to be able to tell if the onwrite cb is called immediately,
      // or on a later tick.  We set this to true at first, because any
      // actions that shouldn't happen until "later" should generally also
      // not happen before the first write call.
      this.sync = true;

      // a flag to know if we're processing previously buffered items, which
      // may call the _write() callback in the same tick, so that we don't
      // end up in an overlapped onwrite situation.
      this.bufferProcessing = false;

      // the callback that's passed to _write(chunk,cb)
      this.onwrite = function (er) {
        onwrite(stream, er);
      };

      // the callback that the user supplies to write(chunk,encoding,cb)
      this.writecb = null;

      // the amount that is being written when _write is called.
      this.writelen = 0;

      this.bufferedRequest = null;
      this.lastBufferedRequest = null;

      // number of pending user-supplied write callbacks
      // this must be 0 before 'finish' can be emitted
      this.pendingcb = 0;

      // emit prefinish if the only thing we're waiting for is _write cbs
      // This is relevant for synchronous Transform streams
      this.prefinished = false;

      // True if the error was already emitted and should not be thrown again
      this.errorEmitted = false;

      // count buffered requests
      this.bufferedRequestCount = 0;

      // allocate the first CorkedRequest, there is always
      // one allocated and free to use, and we maintain at most two
      this.corkedRequestsFree = new CorkedRequest(this);
    }

    WritableState.prototype.getBuffer = function writableStateGetBuffer() {
      var current = this.bufferedRequest;
      var out = [];
      while (current) {
        out.push(current);
        current = current.next;
      }
      return out;
    };
    function Writable(options) {

      // Writable ctor is applied to Duplexes, though they're not
      // instanceof Writable, they're instanceof Readable.
      if (!(this instanceof Writable) && !(this instanceof Duplex)) return new Writable(options);

      this._writableState = new WritableState(options, this);

      // legacy.
      this.writable = true;

      if (options) {
        if (typeof options.write === 'function') this._write = options.write;

        if (typeof options.writev === 'function') this._writev = options.writev;
      }

      EventEmitter.call(this);
    }

    // Otherwise people can pipe Writable streams, which is just wrong.
    Writable.prototype.pipe = function () {
      this.emit('error', new Error('Cannot pipe, not readable'));
    };

    function writeAfterEnd(stream, cb) {
      var er = new Error('write after end');
      // TODO: defer error events consistently everywhere, not just the cb
      stream.emit('error', er);
      nextTick(cb, er);
    }

    // If we get something that is not a buffer, string, null, or undefined,
    // and we're not in objectMode, then that's an error.
    // Otherwise stream chunks are all considered to be of length=1, and the
    // watermarks determine how many objects to keep in the buffer, rather than
    // how many bytes or characters.
    function validChunk(stream, state, chunk, cb) {
      var valid = true;
      var er = false;
      // Always throw error if a null is written
      // if we are not in object mode then throw
      // if it is not a buffer, string, or undefined.
      if (chunk === null) {
        er = new TypeError('May not write null values to stream');
      } else if (!Buffer.isBuffer(chunk) && typeof chunk !== 'string' && chunk !== undefined && !state.objectMode) {
        er = new TypeError('Invalid non-string/buffer chunk');
      }
      if (er) {
        stream.emit('error', er);
        nextTick(cb, er);
        valid = false;
      }
      return valid;
    }

    Writable.prototype.write = function (chunk, encoding, cb) {
      var state = this._writableState;
      var ret = false;

      if (typeof encoding === 'function') {
        cb = encoding;
        encoding = null;
      }

      if (Buffer.isBuffer(chunk)) encoding = 'buffer';else if (!encoding) encoding = state.defaultEncoding;

      if (typeof cb !== 'function') cb = nop;

      if (state.ended) writeAfterEnd(this, cb);else if (validChunk(this, state, chunk, cb)) {
        state.pendingcb++;
        ret = writeOrBuffer(this, state, chunk, encoding, cb);
      }

      return ret;
    };

    Writable.prototype.cork = function () {
      var state = this._writableState;

      state.corked++;
    };

    Writable.prototype.uncork = function () {
      var state = this._writableState;

      if (state.corked) {
        state.corked--;

        if (!state.writing && !state.corked && !state.finished && !state.bufferProcessing && state.bufferedRequest) clearBuffer(this, state);
      }
    };

    Writable.prototype.setDefaultEncoding = function setDefaultEncoding(encoding) {
      // node::ParseEncoding() requires lower case.
      if (typeof encoding === 'string') encoding = encoding.toLowerCase();
      if (!(['hex', 'utf8', 'utf-8', 'ascii', 'binary', 'base64', 'ucs2', 'ucs-2', 'utf16le', 'utf-16le', 'raw'].indexOf((encoding + '').toLowerCase()) > -1)) throw new TypeError('Unknown encoding: ' + encoding);
      this._writableState.defaultEncoding = encoding;
      return this;
    };

    function decodeChunk(state, chunk, encoding) {
      if (!state.objectMode && state.decodeStrings !== false && typeof chunk === 'string') {
        chunk = Buffer.from(chunk, encoding);
      }
      return chunk;
    }

    // if we're already writing something, then just put this
    // in the queue, and wait our turn.  Otherwise, call _write
    // If we return false, then we need a drain event, so set that flag.
    function writeOrBuffer(stream, state, chunk, encoding, cb) {
      chunk = decodeChunk(state, chunk, encoding);

      if (Buffer.isBuffer(chunk)) encoding = 'buffer';
      var len = state.objectMode ? 1 : chunk.length;

      state.length += len;

      var ret = state.length < state.highWaterMark;
      // we must ensure that previous needDrain will not be reset to false.
      if (!ret) state.needDrain = true;

      if (state.writing || state.corked) {
        var last = state.lastBufferedRequest;
        state.lastBufferedRequest = new WriteReq(chunk, encoding, cb);
        if (last) {
          last.next = state.lastBufferedRequest;
        } else {
          state.bufferedRequest = state.lastBufferedRequest;
        }
        state.bufferedRequestCount += 1;
      } else {
        doWrite(stream, state, false, len, chunk, encoding, cb);
      }

      return ret;
    }

    function doWrite(stream, state, writev, len, chunk, encoding, cb) {
      state.writelen = len;
      state.writecb = cb;
      state.writing = true;
      state.sync = true;
      if (writev) stream._writev(chunk, state.onwrite);else stream._write(chunk, encoding, state.onwrite);
      state.sync = false;
    }

    function onwriteError(stream, state, sync, er, cb) {
      --state.pendingcb;
      if (sync) nextTick(cb, er);else cb(er);

      stream._writableState.errorEmitted = true;
      stream.emit('error', er);
    }

    function onwriteStateUpdate(state) {
      state.writing = false;
      state.writecb = null;
      state.length -= state.writelen;
      state.writelen = 0;
    }

    function onwrite(stream, er) {
      var state = stream._writableState;
      var sync = state.sync;
      var cb = state.writecb;

      onwriteStateUpdate(state);

      if (er) onwriteError(stream, state, sync, er, cb);else {
        // Check if we're actually ready to finish, but don't emit yet
        var finished = needFinish(state);

        if (!finished && !state.corked && !state.bufferProcessing && state.bufferedRequest) {
          clearBuffer(stream, state);
        }

        if (sync) {
          /*<replacement>*/
            nextTick(afterWrite, stream, state, finished, cb);
          /*</replacement>*/
        } else {
            afterWrite(stream, state, finished, cb);
          }
      }
    }

    function afterWrite(stream, state, finished, cb) {
      if (!finished) onwriteDrain(stream, state);
      state.pendingcb--;
      cb();
      finishMaybe(stream, state);
    }

    // Must force callback to be called on nextTick, so that we don't
    // emit 'drain' before the write() consumer gets the 'false' return
    // value, and has a chance to attach a 'drain' listener.
    function onwriteDrain(stream, state) {
      if (state.length === 0 && state.needDrain) {
        state.needDrain = false;
        stream.emit('drain');
      }
    }

    // if there's something in the buffer waiting, then process it
    function clearBuffer(stream, state) {
      state.bufferProcessing = true;
      var entry = state.bufferedRequest;

      if (stream._writev && entry && entry.next) {
        // Fast case, write everything using _writev()
        var l = state.bufferedRequestCount;
        var buffer = new Array(l);
        var holder = state.corkedRequestsFree;
        holder.entry = entry;

        var count = 0;
        while (entry) {
          buffer[count] = entry;
          entry = entry.next;
          count += 1;
        }

        doWrite(stream, state, true, state.length, buffer, '', holder.finish);

        // doWrite is almost always async, defer these to save a bit of time
        // as the hot path ends with doWrite
        state.pendingcb++;
        state.lastBufferedRequest = null;
        if (holder.next) {
          state.corkedRequestsFree = holder.next;
          holder.next = null;
        } else {
          state.corkedRequestsFree = new CorkedRequest(state);
        }
      } else {
        // Slow case, write chunks one-by-one
        while (entry) {
          var chunk = entry.chunk;
          var encoding = entry.encoding;
          var cb = entry.callback;
          var len = state.objectMode ? 1 : chunk.length;

          doWrite(stream, state, false, len, chunk, encoding, cb);
          entry = entry.next;
          // if we didn't call the onwrite immediately, then
          // it means that we need to wait until it does.
          // also, that means that the chunk and cb are currently
          // being processed, so move the buffer counter past them.
          if (state.writing) {
            break;
          }
        }

        if (entry === null) state.lastBufferedRequest = null;
      }

      state.bufferedRequestCount = 0;
      state.bufferedRequest = entry;
      state.bufferProcessing = false;
    }

    Writable.prototype._write = function (chunk, encoding, cb) {
      cb(new Error('not implemented'));
    };

    Writable.prototype._writev = null;

    Writable.prototype.end = function (chunk, encoding, cb) {
      var state = this._writableState;

      if (typeof chunk === 'function') {
        cb = chunk;
        chunk = null;
        encoding = null;
      } else if (typeof encoding === 'function') {
        cb = encoding;
        encoding = null;
      }

      if (chunk !== null && chunk !== undefined) this.write(chunk, encoding);

      // .end() fully uncorks
      if (state.corked) {
        state.corked = 1;
        this.uncork();
      }

      // ignore unnecessary end() calls.
      if (!state.ending && !state.finished) endWritable(this, state, cb);
    };

    function needFinish(state) {
      return state.ending && state.length === 0 && state.bufferedRequest === null && !state.finished && !state.writing;
    }

    function prefinish(stream, state) {
      if (!state.prefinished) {
        state.prefinished = true;
        stream.emit('prefinish');
      }
    }

    function finishMaybe(stream, state) {
      var need = needFinish(state);
      if (need) {
        if (state.pendingcb === 0) {
          prefinish(stream, state);
          state.finished = true;
          stream.emit('finish');
        } else {
          prefinish(stream, state);
        }
      }
      return need;
    }

    function endWritable(stream, state, cb) {
      state.ending = true;
      finishMaybe(stream, state);
      if (cb) {
        if (state.finished) nextTick(cb);else stream.once('finish', cb);
      }
      state.ended = true;
      stream.writable = false;
    }

    // It seems a linked list but it is not
    // there will be only 2 of these for each stream
    function CorkedRequest(state) {
      var _this = this;

      this.next = null;
      this.entry = null;

      this.finish = function (err) {
        var entry = _this.entry;
        _this.entry = null;
        while (entry) {
          var cb = entry.callback;
          state.pendingcb--;
          cb(err);
          entry = entry.next;
        }
        if (state.corkedRequestsFree) {
          state.corkedRequestsFree.next = _this;
        } else {
          state.corkedRequestsFree = _this;
        }
      };
    }

    inherits$1(Duplex, Readable);

    var keys = Object.keys(Writable.prototype);
    for (var v = 0; v < keys.length; v++) {
      var method = keys[v];
      if (!Duplex.prototype[method]) Duplex.prototype[method] = Writable.prototype[method];
    }
    function Duplex(options) {
      if (!(this instanceof Duplex)) return new Duplex(options);

      Readable.call(this, options);
      Writable.call(this, options);

      if (options && options.readable === false) this.readable = false;

      if (options && options.writable === false) this.writable = false;

      this.allowHalfOpen = true;
      if (options && options.allowHalfOpen === false) this.allowHalfOpen = false;

      this.once('end', onend);
    }

    // the no-half-open enforcer
    function onend() {
      // if we allow half-open state, or if the writable side ended,
      // then we're ok.
      if (this.allowHalfOpen || this._writableState.ended) return;

      // no more data can be written.
      // But allow more writes to happen in this tick.
      nextTick(onEndNT, this);
    }

    function onEndNT(self) {
      self.end();
    }

    // a transform stream is a readable/writable stream where you do
    inherits$1(Transform, Duplex);

    function TransformState(stream) {
      this.afterTransform = function (er, data) {
        return afterTransform(stream, er, data);
      };

      this.needTransform = false;
      this.transforming = false;
      this.writecb = null;
      this.writechunk = null;
      this.writeencoding = null;
    }

    function afterTransform(stream, er, data) {
      var ts = stream._transformState;
      ts.transforming = false;

      var cb = ts.writecb;

      if (!cb) return stream.emit('error', new Error('no writecb in Transform class'));

      ts.writechunk = null;
      ts.writecb = null;

      if (data !== null && data !== undefined) stream.push(data);

      cb(er);

      var rs = stream._readableState;
      rs.reading = false;
      if (rs.needReadable || rs.length < rs.highWaterMark) {
        stream._read(rs.highWaterMark);
      }
    }
    function Transform(options) {
      if (!(this instanceof Transform)) return new Transform(options);

      Duplex.call(this, options);

      this._transformState = new TransformState(this);

      // when the writable side finishes, then flush out anything remaining.
      var stream = this;

      // start out asking for a readable event once data is transformed.
      this._readableState.needReadable = true;

      // we have implemented the _read method, and done the other things
      // that Readable wants before the first _read call, so unset the
      // sync guard flag.
      this._readableState.sync = false;

      if (options) {
        if (typeof options.transform === 'function') this._transform = options.transform;

        if (typeof options.flush === 'function') this._flush = options.flush;
      }

      this.once('prefinish', function () {
        if (typeof this._flush === 'function') this._flush(function (er) {
          done(stream, er);
        });else done(stream);
      });
    }

    Transform.prototype.push = function (chunk, encoding) {
      this._transformState.needTransform = false;
      return Duplex.prototype.push.call(this, chunk, encoding);
    };

    // This is the part where you do stuff!
    // override this function in implementation classes.
    // 'chunk' is an input chunk.
    //
    // Call `push(newChunk)` to pass along transformed output
    // to the readable side.  You may call 'push' zero or more times.
    //
    // Call `cb(err)` when you are done with this chunk.  If you pass
    // an error, then that'll put the hurt on the whole operation.  If you
    // never call cb(), then you'll never get another chunk.
    Transform.prototype._transform = function (chunk, encoding, cb) {
      throw new Error('Not implemented');
    };

    Transform.prototype._write = function (chunk, encoding, cb) {
      var ts = this._transformState;
      ts.writecb = cb;
      ts.writechunk = chunk;
      ts.writeencoding = encoding;
      if (!ts.transforming) {
        var rs = this._readableState;
        if (ts.needTransform || rs.needReadable || rs.length < rs.highWaterMark) this._read(rs.highWaterMark);
      }
    };

    // Doesn't matter what the args are here.
    // _transform does all the work.
    // That we got here means that the readable side wants more data.
    Transform.prototype._read = function (n) {
      var ts = this._transformState;

      if (ts.writechunk !== null && ts.writecb && !ts.transforming) {
        ts.transforming = true;
        this._transform(ts.writechunk, ts.writeencoding, ts.afterTransform);
      } else {
        // mark that we need a transform, so that any data that comes in
        // will get processed, now that we've asked for it.
        ts.needTransform = true;
      }
    };

    function done(stream, er) {
      if (er) return stream.emit('error', er);

      // if there's nothing in the write buffer, then that means
      // that nothing more will ever be provided
      var ws = stream._writableState;
      var ts = stream._transformState;

      if (ws.length) throw new Error('Calling transform done when ws.length != 0');

      if (ts.transforming) throw new Error('Calling transform done when still transforming');

      return stream.push(null);
    }

    inherits$1(PassThrough, Transform);
    function PassThrough(options) {
      if (!(this instanceof PassThrough)) return new PassThrough(options);

      Transform.call(this, options);
    }

    PassThrough.prototype._transform = function (chunk, encoding, cb) {
      cb(null, chunk);
    };

    inherits$1(Stream, EventEmitter);
    Stream.Readable = Readable;
    Stream.Writable = Writable;
    Stream.Duplex = Duplex;
    Stream.Transform = Transform;
    Stream.PassThrough = PassThrough;

    // Backwards-compat with node 0.4.x
    Stream.Stream = Stream;

    // old-style streams.  Note that the pipe method (the only relevant
    // part of this class) is overridden in the Readable class.

    function Stream() {
      EventEmitter.call(this);
    }

    Stream.prototype.pipe = function(dest, options) {
      var source = this;

      function ondata(chunk) {
        if (dest.writable) {
          if (false === dest.write(chunk) && source.pause) {
            source.pause();
          }
        }
      }

      source.on('data', ondata);

      function ondrain() {
        if (source.readable && source.resume) {
          source.resume();
        }
      }

      dest.on('drain', ondrain);

      // If the 'end' option is not supplied, dest.end() will be called when
      // source gets the 'end' or 'close' events.  Only dest.end() once.
      if (!dest._isStdio && (!options || options.end !== false)) {
        source.on('end', onend);
        source.on('close', onclose);
      }

      var didOnEnd = false;
      function onend() {
        if (didOnEnd) return;
        didOnEnd = true;

        dest.end();
      }


      function onclose() {
        if (didOnEnd) return;
        didOnEnd = true;

        if (typeof dest.destroy === 'function') dest.destroy();
      }

      // don't leave dangling pipes when there are errors.
      function onerror(er) {
        cleanup();
        if (EventEmitter.listenerCount(this, 'error') === 0) {
          throw er; // Unhandled stream error in pipe.
        }
      }

      source.on('error', onerror);
      dest.on('error', onerror);

      // remove all the event listeners that were added.
      function cleanup() {
        source.removeListener('data', ondata);
        dest.removeListener('drain', ondrain);

        source.removeListener('end', onend);
        source.removeListener('close', onclose);

        source.removeListener('error', onerror);
        dest.removeListener('error', onerror);

        source.removeListener('end', cleanup);
        source.removeListener('close', cleanup);

        dest.removeListener('close', cleanup);
      }

      source.on('end', cleanup);
      source.on('close', cleanup);

      dest.on('close', cleanup);

      dest.emit('pipe', source);

      // Allow for unix-like usage: A.pipe(B).pipe(C)
      return dest;
    };

    var stream = /*#__PURE__*/Object.freeze({
        __proto__: null,
        'default': Stream,
        Readable: Readable,
        Writable: Writable,
        Duplex: Duplex,
        Transform: Transform,
        PassThrough: PassThrough,
        Stream: Stream
    });

    var require$$0 = /*@__PURE__*/getAugmentedNamespace(stream);

    /*
     * This file is used by module bundlers (browserify/webpack/etc) when
     * including a stream implementation. We use "readable-stream" to get a
     * consistent behavior between nodejs versions but bundlers often have a shim
     * for "stream". Using this shim greatly improve the compatibility and greatly
     * reduce the final size of the bundle (only one stream implementation, not
     * two).
     */
    var readableStreamBrowser = require$$0;

    var support = createCommonjsModule(function (module, exports) {

    exports.base64 = true;
    exports.array = true;
    exports.string = true;
    exports.arraybuffer = typeof ArrayBuffer !== "undefined" && typeof Uint8Array !== "undefined";
    exports.nodebuffer = typeof Buffer !== "undefined";
    // contains true if JSZip can read/generate Uint8Array, false otherwise.
    exports.uint8array = typeof Uint8Array !== "undefined";

    if (typeof ArrayBuffer === "undefined") {
        exports.blob = false;
    }
    else {
        var buffer = new ArrayBuffer(0);
        try {
            exports.blob = new Blob([buffer], {
                type: "application/zip"
            }).size === 0;
        }
        catch (e) {
            try {
                var Builder = self.BlobBuilder || self.WebKitBlobBuilder || self.MozBlobBuilder || self.MSBlobBuilder;
                var builder = new Builder();
                builder.append(buffer);
                exports.blob = builder.getBlob('application/zip').size === 0;
            }
            catch (e) {
                exports.blob = false;
            }
        }
    }

    try {
        exports.nodestream = !!readableStreamBrowser.Readable;
    } catch(e) {
        exports.nodestream = false;
    }
    });

    // private property
    var _keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";


    // public method for encoding
    var encode = function(input) {
        var output = [];
        var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
        var i = 0, len = input.length, remainingBytes = len;

        var isArray = utils.getTypeOf(input) !== "string";
        while (i < input.length) {
            remainingBytes = len - i;

            if (!isArray) {
                chr1 = input.charCodeAt(i++);
                chr2 = i < len ? input.charCodeAt(i++) : 0;
                chr3 = i < len ? input.charCodeAt(i++) : 0;
            } else {
                chr1 = input[i++];
                chr2 = i < len ? input[i++] : 0;
                chr3 = i < len ? input[i++] : 0;
            }

            enc1 = chr1 >> 2;
            enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            enc3 = remainingBytes > 1 ? (((chr2 & 15) << 2) | (chr3 >> 6)) : 64;
            enc4 = remainingBytes > 2 ? (chr3 & 63) : 64;

            output.push(_keyStr.charAt(enc1) + _keyStr.charAt(enc2) + _keyStr.charAt(enc3) + _keyStr.charAt(enc4));

        }

        return output.join("");
    };

    // public method for decoding
    var decode = function(input) {
        var chr1, chr2, chr3;
        var enc1, enc2, enc3, enc4;
        var i = 0, resultIndex = 0;

        var dataUrlPrefix = "data:";

        if (input.substr(0, dataUrlPrefix.length) === dataUrlPrefix) {
            // This is a common error: people give a data url
            // (data:image/png;base64,iVBOR...) with a {base64: true} and
            // wonders why things don't work.
            // We can detect that the string input looks like a data url but we
            // *can't* be sure it is one: removing everything up to the comma would
            // be too dangerous.
            throw new Error("Invalid base64 input, it looks like a data url.");
        }

        input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

        var totalLength = input.length * 3 / 4;
        if(input.charAt(input.length - 1) === _keyStr.charAt(64)) {
            totalLength--;
        }
        if(input.charAt(input.length - 2) === _keyStr.charAt(64)) {
            totalLength--;
        }
        if (totalLength % 1 !== 0) {
            // totalLength is not an integer, the length does not match a valid
            // base64 content. That can happen if:
            // - the input is not a base64 content
            // - the input is *almost* a base64 content, with a extra chars at the
            //   beginning or at the end
            // - the input uses a base64 variant (base64url for example)
            throw new Error("Invalid base64 input, bad content length.");
        }
        var output;
        if (support.uint8array) {
            output = new Uint8Array(totalLength|0);
        } else {
            output = new Array(totalLength|0);
        }

        while (i < input.length) {

            enc1 = _keyStr.indexOf(input.charAt(i++));
            enc2 = _keyStr.indexOf(input.charAt(i++));
            enc3 = _keyStr.indexOf(input.charAt(i++));
            enc4 = _keyStr.indexOf(input.charAt(i++));

            chr1 = (enc1 << 2) | (enc2 >> 4);
            chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            chr3 = ((enc3 & 3) << 6) | enc4;

            output[resultIndex++] = chr1;

            if (enc3 !== 64) {
                output[resultIndex++] = chr2;
            }
            if (enc4 !== 64) {
                output[resultIndex++] = chr3;
            }

        }

        return output;
    };

    var base64 = {
    	encode: encode,
    	decode: decode
    };

    var nodejsUtils = {
        /**
         * True if this is running in Nodejs, will be undefined in a browser.
         * In a browser, browserify won't include this file and the whole module
         * will be resolved an empty object.
         */
        isNode : typeof Buffer !== "undefined",
        /**
         * Create a new nodejs Buffer from an existing content.
         * @param {Object} data the data to pass to the constructor.
         * @param {String} encoding the encoding to use.
         * @return {Buffer} a new Buffer.
         */
        newBufferFrom: function(data, encoding) {
            if (Buffer.from && Buffer.from !== Uint8Array.from) {
                return Buffer.from(data, encoding);
            } else {
                if (typeof data === "number") {
                    // Safeguard for old Node.js versions. On newer versions,
                    // Buffer.from(number) / Buffer(number, encoding) already throw.
                    throw new Error("The \"data\" argument must not be a number");
                }
                return new Buffer(data, encoding);
            }
        },
        /**
         * Create a new nodejs Buffer with the specified size.
         * @param {Integer} size the size of the buffer.
         * @return {Buffer} a new Buffer.
         */
        allocBuffer: function (size) {
            if (Buffer.alloc) {
                return Buffer.alloc(size);
            } else {
                var buf = new Buffer(size);
                buf.fill(0);
                return buf;
            }
        },
        /**
         * Find out if an object is a Buffer.
         * @param {Object} b the object to test.
         * @return {Boolean} true if the object is a Buffer, false otherwise.
         */
        isBuffer : function(b){
            return isBuffer(b);
        },

        isStream : function (obj) {
            return obj &&
                typeof obj.on === "function" &&
                typeof obj.pause === "function" &&
                typeof obj.resume === "function";
        }
    };

    var setImmediateShim = typeof setImmediate === 'function' ? setImmediate :
    	function setImmediate() {
    		var args = [].slice.apply(arguments);
    		args.splice(1, 0, 0);
    		setTimeout.apply(null, args);
    	};

    var Mutation = commonjsGlobal.MutationObserver || commonjsGlobal.WebKitMutationObserver;

    var scheduleDrain;

    {
      if (Mutation) {
        var called = 0;
        var observer = new Mutation(nextTick$1);
        var element$1 = commonjsGlobal.document.createTextNode('');
        observer.observe(element$1, {
          characterData: true
        });
        scheduleDrain = function () {
          element$1.data = (called = ++called % 2);
        };
      } else if (!commonjsGlobal.setImmediate && typeof commonjsGlobal.MessageChannel !== 'undefined') {
        var channel = new commonjsGlobal.MessageChannel();
        channel.port1.onmessage = nextTick$1;
        scheduleDrain = function () {
          channel.port2.postMessage(0);
        };
      } else if ('document' in commonjsGlobal && 'onreadystatechange' in commonjsGlobal.document.createElement('script')) {
        scheduleDrain = function () {

          // Create a <script> element; its readystatechange event will be fired asynchronously once it is inserted
          // into the document. Do so, thus queuing up the task. Remember to clean up once it's been called.
          var scriptEl = commonjsGlobal.document.createElement('script');
          scriptEl.onreadystatechange = function () {
            nextTick$1();

            scriptEl.onreadystatechange = null;
            scriptEl.parentNode.removeChild(scriptEl);
            scriptEl = null;
          };
          commonjsGlobal.document.documentElement.appendChild(scriptEl);
        };
      } else {
        scheduleDrain = function () {
          setTimeout(nextTick$1, 0);
        };
      }
    }

    var draining$1;
    var queue$1 = [];
    //named nextTick for less confusing stack traces
    function nextTick$1() {
      draining$1 = true;
      var i, oldQueue;
      var len = queue$1.length;
      while (len) {
        oldQueue = queue$1;
        queue$1 = [];
        i = -1;
        while (++i < len) {
          oldQueue[i]();
        }
        len = queue$1.length;
      }
      draining$1 = false;
    }

    var browser = immediate;
    function immediate(task) {
      if (queue$1.push(task) === 1 && !draining$1) {
        scheduleDrain();
      }
    }

    /* istanbul ignore next */
    function INTERNAL() {}

    var handlers = {};

    var REJECTED = ['REJECTED'];
    var FULFILLED = ['FULFILLED'];
    var PENDING = ['PENDING'];

    var browser$1 = Promise$1;

    function Promise$1(resolver) {
      if (typeof resolver !== 'function') {
        throw new TypeError('resolver must be a function');
      }
      this.state = PENDING;
      this.queue = [];
      this.outcome = void 0;
      if (resolver !== INTERNAL) {
        safelyResolveThenable(this, resolver);
      }
    }

    Promise$1.prototype["finally"] = function (callback) {
      if (typeof callback !== 'function') {
        return this;
      }
      var p = this.constructor;
      return this.then(resolve, reject);

      function resolve(value) {
        function yes () {
          return value;
        }
        return p.resolve(callback()).then(yes);
      }
      function reject(reason) {
        function no () {
          throw reason;
        }
        return p.resolve(callback()).then(no);
      }
    };
    Promise$1.prototype["catch"] = function (onRejected) {
      return this.then(null, onRejected);
    };
    Promise$1.prototype.then = function (onFulfilled, onRejected) {
      if (typeof onFulfilled !== 'function' && this.state === FULFILLED ||
        typeof onRejected !== 'function' && this.state === REJECTED) {
        return this;
      }
      var promise = new this.constructor(INTERNAL);
      if (this.state !== PENDING) {
        var resolver = this.state === FULFILLED ? onFulfilled : onRejected;
        unwrap(promise, resolver, this.outcome);
      } else {
        this.queue.push(new QueueItem(promise, onFulfilled, onRejected));
      }

      return promise;
    };
    function QueueItem(promise, onFulfilled, onRejected) {
      this.promise = promise;
      if (typeof onFulfilled === 'function') {
        this.onFulfilled = onFulfilled;
        this.callFulfilled = this.otherCallFulfilled;
      }
      if (typeof onRejected === 'function') {
        this.onRejected = onRejected;
        this.callRejected = this.otherCallRejected;
      }
    }
    QueueItem.prototype.callFulfilled = function (value) {
      handlers.resolve(this.promise, value);
    };
    QueueItem.prototype.otherCallFulfilled = function (value) {
      unwrap(this.promise, this.onFulfilled, value);
    };
    QueueItem.prototype.callRejected = function (value) {
      handlers.reject(this.promise, value);
    };
    QueueItem.prototype.otherCallRejected = function (value) {
      unwrap(this.promise, this.onRejected, value);
    };

    function unwrap(promise, func, value) {
      browser(function () {
        var returnValue;
        try {
          returnValue = func(value);
        } catch (e) {
          return handlers.reject(promise, e);
        }
        if (returnValue === promise) {
          handlers.reject(promise, new TypeError('Cannot resolve promise with itself'));
        } else {
          handlers.resolve(promise, returnValue);
        }
      });
    }

    handlers.resolve = function (self, value) {
      var result = tryCatch(getThen, value);
      if (result.status === 'error') {
        return handlers.reject(self, result.value);
      }
      var thenable = result.value;

      if (thenable) {
        safelyResolveThenable(self, thenable);
      } else {
        self.state = FULFILLED;
        self.outcome = value;
        var i = -1;
        var len = self.queue.length;
        while (++i < len) {
          self.queue[i].callFulfilled(value);
        }
      }
      return self;
    };
    handlers.reject = function (self, error) {
      self.state = REJECTED;
      self.outcome = error;
      var i = -1;
      var len = self.queue.length;
      while (++i < len) {
        self.queue[i].callRejected(error);
      }
      return self;
    };

    function getThen(obj) {
      // Make sure we only access the accessor once as required by the spec
      var then = obj && obj.then;
      if (obj && (typeof obj === 'object' || typeof obj === 'function') && typeof then === 'function') {
        return function appyThen() {
          then.apply(obj, arguments);
        };
      }
    }

    function safelyResolveThenable(self, thenable) {
      // Either fulfill, reject or reject with error
      var called = false;
      function onError(value) {
        if (called) {
          return;
        }
        called = true;
        handlers.reject(self, value);
      }

      function onSuccess(value) {
        if (called) {
          return;
        }
        called = true;
        handlers.resolve(self, value);
      }

      function tryToUnwrap() {
        thenable(onSuccess, onError);
      }

      var result = tryCatch(tryToUnwrap);
      if (result.status === 'error') {
        onError(result.value);
      }
    }

    function tryCatch(func, value) {
      var out = {};
      try {
        out.value = func(value);
        out.status = 'success';
      } catch (e) {
        out.status = 'error';
        out.value = e;
      }
      return out;
    }

    Promise$1.resolve = resolve;
    function resolve(value) {
      if (value instanceof this) {
        return value;
      }
      return handlers.resolve(new this(INTERNAL), value);
    }

    Promise$1.reject = reject;
    function reject(reason) {
      var promise = new this(INTERNAL);
      return handlers.reject(promise, reason);
    }

    Promise$1.all = all;
    function all(iterable) {
      var self = this;
      if (Object.prototype.toString.call(iterable) !== '[object Array]') {
        return this.reject(new TypeError('must be an array'));
      }

      var len = iterable.length;
      var called = false;
      if (!len) {
        return this.resolve([]);
      }

      var values = new Array(len);
      var resolved = 0;
      var i = -1;
      var promise = new this(INTERNAL);

      while (++i < len) {
        allResolver(iterable[i], i);
      }
      return promise;
      function allResolver(value, i) {
        self.resolve(value).then(resolveFromAll, function (error) {
          if (!called) {
            called = true;
            handlers.reject(promise, error);
          }
        });
        function resolveFromAll(outValue) {
          values[i] = outValue;
          if (++resolved === len && !called) {
            called = true;
            handlers.resolve(promise, values);
          }
        }
      }
    }

    Promise$1.race = race;
    function race(iterable) {
      var self = this;
      if (Object.prototype.toString.call(iterable) !== '[object Array]') {
        return this.reject(new TypeError('must be an array'));
      }

      var len = iterable.length;
      var called = false;
      if (!len) {
        return this.resolve([]);
      }

      var i = -1;
      var promise = new this(INTERNAL);

      while (++i < len) {
        resolver(iterable[i]);
      }
      return promise;
      function resolver(value) {
        self.resolve(value).then(function (response) {
          if (!called) {
            called = true;
            handlers.resolve(promise, response);
          }
        }, function (error) {
          if (!called) {
            called = true;
            handlers.reject(promise, error);
          }
        });
      }
    }

    // load the global object first:
    // - it should be better integrated in the system (unhandledRejection in node)
    // - the environment may have a custom Promise implementation (see zone.js)
    var ES6Promise = null;
    if (typeof Promise !== "undefined") {
        ES6Promise = Promise;
    } else {
        ES6Promise = browser$1;
    }

    /**
     * Let the user use/change some implementations.
     */
    var external = {
        Promise: ES6Promise
    };

    var utils = createCommonjsModule(function (module, exports) {








    /**
     * Convert a string that pass as a "binary string": it should represent a byte
     * array but may have > 255 char codes. Be sure to take only the first byte
     * and returns the byte array.
     * @param {String} str the string to transform.
     * @return {Array|Uint8Array} the string in a binary format.
     */
    function string2binary(str) {
        var result = null;
        if (support.uint8array) {
          result = new Uint8Array(str.length);
        } else {
          result = new Array(str.length);
        }
        return stringToArrayLike(str, result);
    }

    /**
     * Create a new blob with the given content and the given type.
     * @param {String|ArrayBuffer} part the content to put in the blob. DO NOT use
     * an Uint8Array because the stock browser of android 4 won't accept it (it
     * will be silently converted to a string, "[object Uint8Array]").
     *
     * Use only ONE part to build the blob to avoid a memory leak in IE11 / Edge:
     * when a large amount of Array is used to create the Blob, the amount of
     * memory consumed is nearly 100 times the original data amount.
     *
     * @param {String} type the mime type of the blob.
     * @return {Blob} the created blob.
     */
    exports.newBlob = function(part, type) {
        exports.checkSupport("blob");

        try {
            // Blob constructor
            return new Blob([part], {
                type: type
            });
        }
        catch (e) {

            try {
                // deprecated, browser only, old way
                var Builder = self.BlobBuilder || self.WebKitBlobBuilder || self.MozBlobBuilder || self.MSBlobBuilder;
                var builder = new Builder();
                builder.append(part);
                return builder.getBlob(type);
            }
            catch (e) {

                // well, fuck ?!
                throw new Error("Bug : can't construct the Blob.");
            }
        }


    };
    /**
     * The identity function.
     * @param {Object} input the input.
     * @return {Object} the same input.
     */
    function identity(input) {
        return input;
    }

    /**
     * Fill in an array with a string.
     * @param {String} str the string to use.
     * @param {Array|ArrayBuffer|Uint8Array|Buffer} array the array to fill in (will be mutated).
     * @return {Array|ArrayBuffer|Uint8Array|Buffer} the updated array.
     */
    function stringToArrayLike(str, array) {
        for (var i = 0; i < str.length; ++i) {
            array[i] = str.charCodeAt(i) & 0xFF;
        }
        return array;
    }

    /**
     * An helper for the function arrayLikeToString.
     * This contains static information and functions that
     * can be optimized by the browser JIT compiler.
     */
    var arrayToStringHelper = {
        /**
         * Transform an array of int into a string, chunk by chunk.
         * See the performances notes on arrayLikeToString.
         * @param {Array|ArrayBuffer|Uint8Array|Buffer} array the array to transform.
         * @param {String} type the type of the array.
         * @param {Integer} chunk the chunk size.
         * @return {String} the resulting string.
         * @throws Error if the chunk is too big for the stack.
         */
        stringifyByChunk: function(array, type, chunk) {
            var result = [], k = 0, len = array.length;
            // shortcut
            if (len <= chunk) {
                return String.fromCharCode.apply(null, array);
            }
            while (k < len) {
                if (type === "array" || type === "nodebuffer") {
                    result.push(String.fromCharCode.apply(null, array.slice(k, Math.min(k + chunk, len))));
                }
                else {
                    result.push(String.fromCharCode.apply(null, array.subarray(k, Math.min(k + chunk, len))));
                }
                k += chunk;
            }
            return result.join("");
        },
        /**
         * Call String.fromCharCode on every item in the array.
         * This is the naive implementation, which generate A LOT of intermediate string.
         * This should be used when everything else fail.
         * @param {Array|ArrayBuffer|Uint8Array|Buffer} array the array to transform.
         * @return {String} the result.
         */
        stringifyByChar: function(array){
            var resultStr = "";
            for(var i = 0; i < array.length; i++) {
                resultStr += String.fromCharCode(array[i]);
            }
            return resultStr;
        },
        applyCanBeUsed : {
            /**
             * true if the browser accepts to use String.fromCharCode on Uint8Array
             */
            uint8array : (function () {
                try {
                    return support.uint8array && String.fromCharCode.apply(null, new Uint8Array(1)).length === 1;
                } catch (e) {
                    return false;
                }
            })(),
            /**
             * true if the browser accepts to use String.fromCharCode on nodejs Buffer.
             */
            nodebuffer : (function () {
                try {
                    return support.nodebuffer && String.fromCharCode.apply(null, nodejsUtils.allocBuffer(1)).length === 1;
                } catch (e) {
                    return false;
                }
            })()
        }
    };

    /**
     * Transform an array-like object to a string.
     * @param {Array|ArrayBuffer|Uint8Array|Buffer} array the array to transform.
     * @return {String} the result.
     */
    function arrayLikeToString(array) {
        // Performances notes :
        // --------------------
        // String.fromCharCode.apply(null, array) is the fastest, see
        // see http://jsperf.com/converting-a-uint8array-to-a-string/2
        // but the stack is limited (and we can get huge arrays !).
        //
        // result += String.fromCharCode(array[i]); generate too many strings !
        //
        // This code is inspired by http://jsperf.com/arraybuffer-to-string-apply-performance/2
        // TODO : we now have workers that split the work. Do we still need that ?
        var chunk = 65536,
            type = exports.getTypeOf(array),
            canUseApply = true;
        if (type === "uint8array") {
            canUseApply = arrayToStringHelper.applyCanBeUsed.uint8array;
        } else if (type === "nodebuffer") {
            canUseApply = arrayToStringHelper.applyCanBeUsed.nodebuffer;
        }

        if (canUseApply) {
            while (chunk > 1) {
                try {
                    return arrayToStringHelper.stringifyByChunk(array, type, chunk);
                } catch (e) {
                    chunk = Math.floor(chunk / 2);
                }
            }
        }

        // no apply or chunk error : slow and painful algorithm
        // default browser on android 4.*
        return arrayToStringHelper.stringifyByChar(array);
    }

    exports.applyFromCharCode = arrayLikeToString;


    /**
     * Copy the data from an array-like to an other array-like.
     * @param {Array|ArrayBuffer|Uint8Array|Buffer} arrayFrom the origin array.
     * @param {Array|ArrayBuffer|Uint8Array|Buffer} arrayTo the destination array which will be mutated.
     * @return {Array|ArrayBuffer|Uint8Array|Buffer} the updated destination array.
     */
    function arrayLikeToArrayLike(arrayFrom, arrayTo) {
        for (var i = 0; i < arrayFrom.length; i++) {
            arrayTo[i] = arrayFrom[i];
        }
        return arrayTo;
    }

    // a matrix containing functions to transform everything into everything.
    var transform = {};

    // string to ?
    transform["string"] = {
        "string": identity,
        "array": function(input) {
            return stringToArrayLike(input, new Array(input.length));
        },
        "arraybuffer": function(input) {
            return transform["string"]["uint8array"](input).buffer;
        },
        "uint8array": function(input) {
            return stringToArrayLike(input, new Uint8Array(input.length));
        },
        "nodebuffer": function(input) {
            return stringToArrayLike(input, nodejsUtils.allocBuffer(input.length));
        }
    };

    // array to ?
    transform["array"] = {
        "string": arrayLikeToString,
        "array": identity,
        "arraybuffer": function(input) {
            return (new Uint8Array(input)).buffer;
        },
        "uint8array": function(input) {
            return new Uint8Array(input);
        },
        "nodebuffer": function(input) {
            return nodejsUtils.newBufferFrom(input);
        }
    };

    // arraybuffer to ?
    transform["arraybuffer"] = {
        "string": function(input) {
            return arrayLikeToString(new Uint8Array(input));
        },
        "array": function(input) {
            return arrayLikeToArrayLike(new Uint8Array(input), new Array(input.byteLength));
        },
        "arraybuffer": identity,
        "uint8array": function(input) {
            return new Uint8Array(input);
        },
        "nodebuffer": function(input) {
            return nodejsUtils.newBufferFrom(new Uint8Array(input));
        }
    };

    // uint8array to ?
    transform["uint8array"] = {
        "string": arrayLikeToString,
        "array": function(input) {
            return arrayLikeToArrayLike(input, new Array(input.length));
        },
        "arraybuffer": function(input) {
            return input.buffer;
        },
        "uint8array": identity,
        "nodebuffer": function(input) {
            return nodejsUtils.newBufferFrom(input);
        }
    };

    // nodebuffer to ?
    transform["nodebuffer"] = {
        "string": arrayLikeToString,
        "array": function(input) {
            return arrayLikeToArrayLike(input, new Array(input.length));
        },
        "arraybuffer": function(input) {
            return transform["nodebuffer"]["uint8array"](input).buffer;
        },
        "uint8array": function(input) {
            return arrayLikeToArrayLike(input, new Uint8Array(input.length));
        },
        "nodebuffer": identity
    };

    /**
     * Transform an input into any type.
     * The supported output type are : string, array, uint8array, arraybuffer, nodebuffer.
     * If no output type is specified, the unmodified input will be returned.
     * @param {String} outputType the output type.
     * @param {String|Array|ArrayBuffer|Uint8Array|Buffer} input the input to convert.
     * @throws {Error} an Error if the browser doesn't support the requested output type.
     */
    exports.transformTo = function(outputType, input) {
        if (!input) {
            // undefined, null, etc
            // an empty string won't harm.
            input = "";
        }
        if (!outputType) {
            return input;
        }
        exports.checkSupport(outputType);
        var inputType = exports.getTypeOf(input);
        var result = transform[inputType][outputType](input);
        return result;
    };

    /**
     * Return the type of the input.
     * The type will be in a format valid for JSZip.utils.transformTo : string, array, uint8array, arraybuffer.
     * @param {Object} input the input to identify.
     * @return {String} the (lowercase) type of the input.
     */
    exports.getTypeOf = function(input) {
        if (typeof input === "string") {
            return "string";
        }
        if (Object.prototype.toString.call(input) === "[object Array]") {
            return "array";
        }
        if (support.nodebuffer && nodejsUtils.isBuffer(input)) {
            return "nodebuffer";
        }
        if (support.uint8array && input instanceof Uint8Array) {
            return "uint8array";
        }
        if (support.arraybuffer && input instanceof ArrayBuffer) {
            return "arraybuffer";
        }
    };

    /**
     * Throw an exception if the type is not supported.
     * @param {String} type the type to check.
     * @throws {Error} an Error if the browser doesn't support the requested type.
     */
    exports.checkSupport = function(type) {
        var supported = support[type.toLowerCase()];
        if (!supported) {
            throw new Error(type + " is not supported by this platform");
        }
    };

    exports.MAX_VALUE_16BITS = 65535;
    exports.MAX_VALUE_32BITS = -1; // well, "\xFF\xFF\xFF\xFF\xFF\xFF\xFF\xFF" is parsed as -1

    /**
     * Prettify a string read as binary.
     * @param {string} str the string to prettify.
     * @return {string} a pretty string.
     */
    exports.pretty = function(str) {
        var res = '',
            code, i;
        for (i = 0; i < (str || "").length; i++) {
            code = str.charCodeAt(i);
            res += '\\x' + (code < 16 ? "0" : "") + code.toString(16).toUpperCase();
        }
        return res;
    };

    /**
     * Defer the call of a function.
     * @param {Function} callback the function to call asynchronously.
     * @param {Array} args the arguments to give to the callback.
     */
    exports.delay = function(callback, args, self) {
        setImmediateShim(function () {
            callback.apply(self || null, args || []);
        });
    };

    /**
     * Extends a prototype with an other, without calling a constructor with
     * side effects. Inspired by nodejs' `utils.inherits`
     * @param {Function} ctor the constructor to augment
     * @param {Function} superCtor the parent constructor to use
     */
    exports.inherits = function (ctor, superCtor) {
        var Obj = function() {};
        Obj.prototype = superCtor.prototype;
        ctor.prototype = new Obj();
    };

    /**
     * Merge the objects passed as parameters into a new one.
     * @private
     * @param {...Object} var_args All objects to merge.
     * @return {Object} a new object with the data of the others.
     */
    exports.extend = function() {
        var result = {}, i, attr;
        for (i = 0; i < arguments.length; i++) { // arguments is not enumerable in some browsers
            for (attr in arguments[i]) {
                if (arguments[i].hasOwnProperty(attr) && typeof result[attr] === "undefined") {
                    result[attr] = arguments[i][attr];
                }
            }
        }
        return result;
    };

    /**
     * Transform arbitrary content into a Promise.
     * @param {String} name a name for the content being processed.
     * @param {Object} inputData the content to process.
     * @param {Boolean} isBinary true if the content is not an unicode string
     * @param {Boolean} isOptimizedBinaryString true if the string content only has one byte per character.
     * @param {Boolean} isBase64 true if the string content is encoded with base64.
     * @return {Promise} a promise in a format usable by JSZip.
     */
    exports.prepareContent = function(name, inputData, isBinary, isOptimizedBinaryString, isBase64) {

        // if inputData is already a promise, this flatten it.
        var promise = external.Promise.resolve(inputData).then(function(data) {
            
            
            var isBlob = support.blob && (data instanceof Blob || ['[object File]', '[object Blob]'].indexOf(Object.prototype.toString.call(data)) !== -1);

            if (isBlob && typeof FileReader !== "undefined") {
                return new external.Promise(function (resolve, reject) {
                    var reader = new FileReader();

                    reader.onload = function(e) {
                        resolve(e.target.result);
                    };
                    reader.onerror = function(e) {
                        reject(e.target.error);
                    };
                    reader.readAsArrayBuffer(data);
                });
            } else {
                return data;
            }
        });

        return promise.then(function(data) {
            var dataType = exports.getTypeOf(data);

            if (!dataType) {
                return external.Promise.reject(
                    new Error("Can't read the data of '" + name + "'. Is it " +
                              "in a supported JavaScript type (String, Blob, ArrayBuffer, etc) ?")
                );
            }
            // special case : it's way easier to work with Uint8Array than with ArrayBuffer
            if (dataType === "arraybuffer") {
                data = exports.transformTo("uint8array", data);
            } else if (dataType === "string") {
                if (isBase64) {
                    data = base64.decode(data);
                }
                else if (isBinary) {
                    // optimizedBinaryString === true means that the file has already been filtered with a 0xFF mask
                    if (isOptimizedBinaryString !== true) {
                        // this is a string, not in a base64 format.
                        // Be sure that this is a correct "binary string"
                        data = string2binary(data);
                    }
                }
            }
            return data;
        });
    };
    });

    /**
     * A worker that does nothing but passing chunks to the next one. This is like
     * a nodejs stream but with some differences. On the good side :
     * - it works on IE 6-9 without any issue / polyfill
     * - it weights less than the full dependencies bundled with browserify
     * - it forwards errors (no need to declare an error handler EVERYWHERE)
     *
     * A chunk is an object with 2 attributes : `meta` and `data`. The former is an
     * object containing anything (`percent` for example), see each worker for more
     * details. The latter is the real data (String, Uint8Array, etc).
     *
     * @constructor
     * @param {String} name the name of the stream (mainly used for debugging purposes)
     */
    function GenericWorker(name) {
        // the name of the worker
        this.name = name || "default";
        // an object containing metadata about the workers chain
        this.streamInfo = {};
        // an error which happened when the worker was paused
        this.generatedError = null;
        // an object containing metadata to be merged by this worker into the general metadata
        this.extraStreamInfo = {};
        // true if the stream is paused (and should not do anything), false otherwise
        this.isPaused = true;
        // true if the stream is finished (and should not do anything), false otherwise
        this.isFinished = false;
        // true if the stream is locked to prevent further structure updates (pipe), false otherwise
        this.isLocked = false;
        // the event listeners
        this._listeners = {
            'data':[],
            'end':[],
            'error':[]
        };
        // the previous worker, if any
        this.previous = null;
    }

    GenericWorker.prototype = {
        /**
         * Push a chunk to the next workers.
         * @param {Object} chunk the chunk to push
         */
        push : function (chunk) {
            this.emit("data", chunk);
        },
        /**
         * End the stream.
         * @return {Boolean} true if this call ended the worker, false otherwise.
         */
        end : function () {
            if (this.isFinished) {
                return false;
            }

            this.flush();
            try {
                this.emit("end");
                this.cleanUp();
                this.isFinished = true;
            } catch (e) {
                this.emit("error", e);
            }
            return true;
        },
        /**
         * End the stream with an error.
         * @param {Error} e the error which caused the premature end.
         * @return {Boolean} true if this call ended the worker with an error, false otherwise.
         */
        error : function (e) {
            if (this.isFinished) {
                return false;
            }

            if(this.isPaused) {
                this.generatedError = e;
            } else {
                this.isFinished = true;

                this.emit("error", e);

                // in the workers chain exploded in the middle of the chain,
                // the error event will go downward but we also need to notify
                // workers upward that there has been an error.
                if(this.previous) {
                    this.previous.error(e);
                }

                this.cleanUp();
            }
            return true;
        },
        /**
         * Add a callback on an event.
         * @param {String} name the name of the event (data, end, error)
         * @param {Function} listener the function to call when the event is triggered
         * @return {GenericWorker} the current object for chainability
         */
        on : function (name, listener) {
            this._listeners[name].push(listener);
            return this;
        },
        /**
         * Clean any references when a worker is ending.
         */
        cleanUp : function () {
            this.streamInfo = this.generatedError = this.extraStreamInfo = null;
            this._listeners = [];
        },
        /**
         * Trigger an event. This will call registered callback with the provided arg.
         * @param {String} name the name of the event (data, end, error)
         * @param {Object} arg the argument to call the callback with.
         */
        emit : function (name, arg) {
            if (this._listeners[name]) {
                for(var i = 0; i < this._listeners[name].length; i++) {
                    this._listeners[name][i].call(this, arg);
                }
            }
        },
        /**
         * Chain a worker with an other.
         * @param {Worker} next the worker receiving events from the current one.
         * @return {worker} the next worker for chainability
         */
        pipe : function (next) {
            return next.registerPrevious(this);
        },
        /**
         * Same as `pipe` in the other direction.
         * Using an API with `pipe(next)` is very easy.
         * Implementing the API with the point of view of the next one registering
         * a source is easier, see the ZipFileWorker.
         * @param {Worker} previous the previous worker, sending events to this one
         * @return {Worker} the current worker for chainability
         */
        registerPrevious : function (previous) {
            if (this.isLocked) {
                throw new Error("The stream '" + this + "' has already been used.");
            }

            // sharing the streamInfo...
            this.streamInfo = previous.streamInfo;
            // ... and adding our own bits
            this.mergeStreamInfo();
            this.previous =  previous;
            var self = this;
            previous.on('data', function (chunk) {
                self.processChunk(chunk);
            });
            previous.on('end', function () {
                self.end();
            });
            previous.on('error', function (e) {
                self.error(e);
            });
            return this;
        },
        /**
         * Pause the stream so it doesn't send events anymore.
         * @return {Boolean} true if this call paused the worker, false otherwise.
         */
        pause : function () {
            if(this.isPaused || this.isFinished) {
                return false;
            }
            this.isPaused = true;

            if(this.previous) {
                this.previous.pause();
            }
            return true;
        },
        /**
         * Resume a paused stream.
         * @return {Boolean} true if this call resumed the worker, false otherwise.
         */
        resume : function () {
            if(!this.isPaused || this.isFinished) {
                return false;
            }
            this.isPaused = false;

            // if true, the worker tried to resume but failed
            var withError = false;
            if(this.generatedError) {
                this.error(this.generatedError);
                withError = true;
            }
            if(this.previous) {
                this.previous.resume();
            }

            return !withError;
        },
        /**
         * Flush any remaining bytes as the stream is ending.
         */
        flush : function () {},
        /**
         * Process a chunk. This is usually the method overridden.
         * @param {Object} chunk the chunk to process.
         */
        processChunk : function(chunk) {
            this.push(chunk);
        },
        /**
         * Add a key/value to be added in the workers chain streamInfo once activated.
         * @param {String} key the key to use
         * @param {Object} value the associated value
         * @return {Worker} the current worker for chainability
         */
        withStreamInfo : function (key, value) {
            this.extraStreamInfo[key] = value;
            this.mergeStreamInfo();
            return this;
        },
        /**
         * Merge this worker's streamInfo into the chain's streamInfo.
         */
        mergeStreamInfo : function () {
            for(var key in this.extraStreamInfo) {
                if (!this.extraStreamInfo.hasOwnProperty(key)) {
                    continue;
                }
                this.streamInfo[key] = this.extraStreamInfo[key];
            }
        },

        /**
         * Lock the stream to prevent further updates on the workers chain.
         * After calling this method, all calls to pipe will fail.
         */
        lock: function () {
            if (this.isLocked) {
                throw new Error("The stream '" + this + "' has already been used.");
            }
            this.isLocked = true;
            if (this.previous) {
                this.previous.lock();
            }
        },

        /**
         *
         * Pretty print the workers chain.
         */
        toString : function () {
            var me = "Worker " + this.name;
            if (this.previous) {
                return this.previous + " -> " + me;
            } else {
                return me;
            }
        }
    };

    var GenericWorker_1 = GenericWorker;

    var utf8 = createCommonjsModule(function (module, exports) {






    /**
     * The following functions come from pako, from pako/lib/utils/strings
     * released under the MIT license, see pako https://github.com/nodeca/pako/
     */

    // Table with utf8 lengths (calculated by first byte of sequence)
    // Note, that 5 & 6-byte values and some 4-byte values can not be represented in JS,
    // because max possible codepoint is 0x10ffff
    var _utf8len = new Array(256);
    for (var i=0; i<256; i++) {
      _utf8len[i] = (i >= 252 ? 6 : i >= 248 ? 5 : i >= 240 ? 4 : i >= 224 ? 3 : i >= 192 ? 2 : 1);
    }
    _utf8len[254]=_utf8len[254]=1; // Invalid sequence start

    // convert string to array (typed, when possible)
    var string2buf = function (str) {
        var buf, c, c2, m_pos, i, str_len = str.length, buf_len = 0;

        // count binary size
        for (m_pos = 0; m_pos < str_len; m_pos++) {
            c = str.charCodeAt(m_pos);
            if ((c & 0xfc00) === 0xd800 && (m_pos+1 < str_len)) {
                c2 = str.charCodeAt(m_pos+1);
                if ((c2 & 0xfc00) === 0xdc00) {
                    c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
                    m_pos++;
                }
            }
            buf_len += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
        }

        // allocate buffer
        if (support.uint8array) {
            buf = new Uint8Array(buf_len);
        } else {
            buf = new Array(buf_len);
        }

        // convert
        for (i=0, m_pos = 0; i < buf_len; m_pos++) {
            c = str.charCodeAt(m_pos);
            if ((c & 0xfc00) === 0xd800 && (m_pos+1 < str_len)) {
                c2 = str.charCodeAt(m_pos+1);
                if ((c2 & 0xfc00) === 0xdc00) {
                    c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
                    m_pos++;
                }
            }
            if (c < 0x80) {
                /* one byte */
                buf[i++] = c;
            } else if (c < 0x800) {
                /* two bytes */
                buf[i++] = 0xC0 | (c >>> 6);
                buf[i++] = 0x80 | (c & 0x3f);
            } else if (c < 0x10000) {
                /* three bytes */
                buf[i++] = 0xE0 | (c >>> 12);
                buf[i++] = 0x80 | (c >>> 6 & 0x3f);
                buf[i++] = 0x80 | (c & 0x3f);
            } else {
                /* four bytes */
                buf[i++] = 0xf0 | (c >>> 18);
                buf[i++] = 0x80 | (c >>> 12 & 0x3f);
                buf[i++] = 0x80 | (c >>> 6 & 0x3f);
                buf[i++] = 0x80 | (c & 0x3f);
            }
        }

        return buf;
    };

    // Calculate max possible position in utf8 buffer,
    // that will not break sequence. If that's not possible
    // - (very small limits) return max size as is.
    //
    // buf[] - utf8 bytes array
    // max   - length limit (mandatory);
    var utf8border = function(buf, max) {
        var pos;

        max = max || buf.length;
        if (max > buf.length) { max = buf.length; }

        // go back from last position, until start of sequence found
        pos = max-1;
        while (pos >= 0 && (buf[pos] & 0xC0) === 0x80) { pos--; }

        // Fuckup - very small and broken sequence,
        // return max, because we should return something anyway.
        if (pos < 0) { return max; }

        // If we came to start of buffer - that means vuffer is too small,
        // return max too.
        if (pos === 0) { return max; }

        return (pos + _utf8len[buf[pos]] > max) ? pos : max;
    };

    // convert array to string
    var buf2string = function (buf) {
        var i, out, c, c_len;
        var len = buf.length;

        // Reserve max possible length (2 words per char)
        // NB: by unknown reasons, Array is significantly faster for
        //     String.fromCharCode.apply than Uint16Array.
        var utf16buf = new Array(len*2);

        for (out=0, i=0; i<len;) {
            c = buf[i++];
            // quick process ascii
            if (c < 0x80) { utf16buf[out++] = c; continue; }

            c_len = _utf8len[c];
            // skip 5 & 6 byte codes
            if (c_len > 4) { utf16buf[out++] = 0xfffd; i += c_len-1; continue; }

            // apply mask on first byte
            c &= c_len === 2 ? 0x1f : c_len === 3 ? 0x0f : 0x07;
            // join the rest
            while (c_len > 1 && i < len) {
                c = (c << 6) | (buf[i++] & 0x3f);
                c_len--;
            }

            // terminated by end of string?
            if (c_len > 1) { utf16buf[out++] = 0xfffd; continue; }

            if (c < 0x10000) {
                utf16buf[out++] = c;
            } else {
                c -= 0x10000;
                utf16buf[out++] = 0xd800 | ((c >> 10) & 0x3ff);
                utf16buf[out++] = 0xdc00 | (c & 0x3ff);
            }
        }

        // shrinkBuf(utf16buf, out)
        if (utf16buf.length !== out) {
            if(utf16buf.subarray) {
                utf16buf = utf16buf.subarray(0, out);
            } else {
                utf16buf.length = out;
            }
        }

        // return String.fromCharCode.apply(null, utf16buf);
        return utils.applyFromCharCode(utf16buf);
    };


    // That's all for the pako functions.


    /**
     * Transform a javascript string into an array (typed if possible) of bytes,
     * UTF-8 encoded.
     * @param {String} str the string to encode
     * @return {Array|Uint8Array|Buffer} the UTF-8 encoded string.
     */
    exports.utf8encode = function utf8encode(str) {
        if (support.nodebuffer) {
            return nodejsUtils.newBufferFrom(str, "utf-8");
        }

        return string2buf(str);
    };


    /**
     * Transform a bytes array (or a representation) representing an UTF-8 encoded
     * string into a javascript string.
     * @param {Array|Uint8Array|Buffer} buf the data de decode
     * @return {String} the decoded string.
     */
    exports.utf8decode = function utf8decode(buf) {
        if (support.nodebuffer) {
            return utils.transformTo("nodebuffer", buf).toString("utf-8");
        }

        buf = utils.transformTo(support.uint8array ? "uint8array" : "array", buf);

        return buf2string(buf);
    };

    /**
     * A worker to decode utf8 encoded binary chunks into string chunks.
     * @constructor
     */
    function Utf8DecodeWorker() {
        GenericWorker_1.call(this, "utf-8 decode");
        // the last bytes if a chunk didn't end with a complete codepoint.
        this.leftOver = null;
    }
    utils.inherits(Utf8DecodeWorker, GenericWorker_1);

    /**
     * @see GenericWorker.processChunk
     */
    Utf8DecodeWorker.prototype.processChunk = function (chunk) {

        var data = utils.transformTo(support.uint8array ? "uint8array" : "array", chunk.data);

        // 1st step, re-use what's left of the previous chunk
        if (this.leftOver && this.leftOver.length) {
            if(support.uint8array) {
                var previousData = data;
                data = new Uint8Array(previousData.length + this.leftOver.length);
                data.set(this.leftOver, 0);
                data.set(previousData, this.leftOver.length);
            } else {
                data = this.leftOver.concat(data);
            }
            this.leftOver = null;
        }

        var nextBoundary = utf8border(data);
        var usableData = data;
        if (nextBoundary !== data.length) {
            if (support.uint8array) {
                usableData = data.subarray(0, nextBoundary);
                this.leftOver = data.subarray(nextBoundary, data.length);
            } else {
                usableData = data.slice(0, nextBoundary);
                this.leftOver = data.slice(nextBoundary, data.length);
            }
        }

        this.push({
            data : exports.utf8decode(usableData),
            meta : chunk.meta
        });
    };

    /**
     * @see GenericWorker.flush
     */
    Utf8DecodeWorker.prototype.flush = function () {
        if(this.leftOver && this.leftOver.length) {
            this.push({
                data : exports.utf8decode(this.leftOver),
                meta : {}
            });
            this.leftOver = null;
        }
    };
    exports.Utf8DecodeWorker = Utf8DecodeWorker;

    /**
     * A worker to endcode string chunks into utf8 encoded binary chunks.
     * @constructor
     */
    function Utf8EncodeWorker() {
        GenericWorker_1.call(this, "utf-8 encode");
    }
    utils.inherits(Utf8EncodeWorker, GenericWorker_1);

    /**
     * @see GenericWorker.processChunk
     */
    Utf8EncodeWorker.prototype.processChunk = function (chunk) {
        this.push({
            data : exports.utf8encode(chunk.data),
            meta : chunk.meta
        });
    };
    exports.Utf8EncodeWorker = Utf8EncodeWorker;
    });

    /**
     * A worker which convert chunks to a specified type.
     * @constructor
     * @param {String} destType the destination type.
     */
    function ConvertWorker(destType) {
        GenericWorker_1.call(this, "ConvertWorker to " + destType);
        this.destType = destType;
    }
    utils.inherits(ConvertWorker, GenericWorker_1);

    /**
     * @see GenericWorker.processChunk
     */
    ConvertWorker.prototype.processChunk = function (chunk) {
        this.push({
            data : utils.transformTo(this.destType, chunk.data),
            meta : chunk.meta
        });
    };
    var ConvertWorker_1 = ConvertWorker;

    var Readable$1 = readableStreamBrowser.Readable;


    utils.inherits(NodejsStreamOutputAdapter, Readable$1);

    /**
    * A nodejs stream using a worker as source.
    * @see the SourceWrapper in http://nodejs.org/api/stream.html
    * @constructor
    * @param {StreamHelper} helper the helper wrapping the worker
    * @param {Object} options the nodejs stream options
    * @param {Function} updateCb the update callback.
    */
    function NodejsStreamOutputAdapter(helper, options, updateCb) {
        Readable$1.call(this, options);
        this._helper = helper;

        var self = this;
        helper.on("data", function (data, meta) {
            if (!self.push(data)) {
                self._helper.pause();
            }
            if(updateCb) {
                updateCb(meta);
            }
        })
        .on("error", function(e) {
            self.emit('error', e);
        })
        .on("end", function () {
            self.push(null);
        });
    }


    NodejsStreamOutputAdapter.prototype._read = function() {
        this._helper.resume();
    };

    var NodejsStreamOutputAdapter_1 = NodejsStreamOutputAdapter;

    var NodejsStreamOutputAdapter$1 = null;
    if (support.nodestream) {
        try {
            NodejsStreamOutputAdapter$1 = NodejsStreamOutputAdapter_1;
        } catch(e) {}
    }

    /**
     * Apply the final transformation of the data. If the user wants a Blob for
     * example, it's easier to work with an U8intArray and finally do the
     * ArrayBuffer/Blob conversion.
     * @param {String} type the name of the final type
     * @param {String|Uint8Array|Buffer} content the content to transform
     * @param {String} mimeType the mime type of the content, if applicable.
     * @return {String|Uint8Array|ArrayBuffer|Buffer|Blob} the content in the right format.
     */
    function transformZipOutput(type, content, mimeType) {
        switch(type) {
            case "blob" :
                return utils.newBlob(utils.transformTo("arraybuffer", content), mimeType);
            case "base64" :
                return base64.encode(content);
            default :
                return utils.transformTo(type, content);
        }
    }

    /**
     * Concatenate an array of data of the given type.
     * @param {String} type the type of the data in the given array.
     * @param {Array} dataArray the array containing the data chunks to concatenate
     * @return {String|Uint8Array|Buffer} the concatenated data
     * @throws Error if the asked type is unsupported
     */
    function concat (type, dataArray) {
        var i, index = 0, res = null, totalLength = 0;
        for(i = 0; i < dataArray.length; i++) {
            totalLength += dataArray[i].length;
        }
        switch(type) {
            case "string":
                return dataArray.join("");
              case "array":
                return Array.prototype.concat.apply([], dataArray);
            case "uint8array":
                res = new Uint8Array(totalLength);
                for(i = 0; i < dataArray.length; i++) {
                    res.set(dataArray[i], index);
                    index += dataArray[i].length;
                }
                return res;
            case "nodebuffer":
                return Buffer.concat(dataArray);
            default:
                throw new Error("concat : unsupported type '"  + type + "'");
        }
    }

    /**
     * Listen a StreamHelper, accumulate its content and concatenate it into a
     * complete block.
     * @param {StreamHelper} helper the helper to use.
     * @param {Function} updateCallback a callback called on each update. Called
     * with one arg :
     * - the metadata linked to the update received.
     * @return Promise the promise for the accumulation.
     */
    function accumulate(helper, updateCallback) {
        return new external.Promise(function (resolve, reject){
            var dataArray = [];
            var chunkType = helper._internalType,
                resultType = helper._outputType,
                mimeType = helper._mimeType;
            helper
            .on('data', function (data, meta) {
                dataArray.push(data);
                if(updateCallback) {
                    updateCallback(meta);
                }
            })
            .on('error', function(err) {
                dataArray = [];
                reject(err);
            })
            .on('end', function (){
                try {
                    var result = transformZipOutput(resultType, concat(chunkType, dataArray), mimeType);
                    resolve(result);
                } catch (e) {
                    reject(e);
                }
                dataArray = [];
            })
            .resume();
        });
    }

    /**
     * An helper to easily use workers outside of JSZip.
     * @constructor
     * @param {Worker} worker the worker to wrap
     * @param {String} outputType the type of data expected by the use
     * @param {String} mimeType the mime type of the content, if applicable.
     */
    function StreamHelper(worker, outputType, mimeType) {
        var internalType = outputType;
        switch(outputType) {
            case "blob":
            case "arraybuffer":
                internalType = "uint8array";
            break;
            case "base64":
                internalType = "string";
            break;
        }

        try {
            // the type used internally
            this._internalType = internalType;
            // the type used to output results
            this._outputType = outputType;
            // the mime type
            this._mimeType = mimeType;
            utils.checkSupport(internalType);
            this._worker = worker.pipe(new ConvertWorker_1(internalType));
            // the last workers can be rewired without issues but we need to
            // prevent any updates on previous workers.
            worker.lock();
        } catch(e) {
            this._worker = new GenericWorker_1("error");
            this._worker.error(e);
        }
    }

    StreamHelper.prototype = {
        /**
         * Listen a StreamHelper, accumulate its content and concatenate it into a
         * complete block.
         * @param {Function} updateCb the update callback.
         * @return Promise the promise for the accumulation.
         */
        accumulate : function (updateCb) {
            return accumulate(this, updateCb);
        },
        /**
         * Add a listener on an event triggered on a stream.
         * @param {String} evt the name of the event
         * @param {Function} fn the listener
         * @return {StreamHelper} the current helper.
         */
        on : function (evt, fn) {
            var self = this;

            if(evt === "data") {
                this._worker.on(evt, function (chunk) {
                    fn.call(self, chunk.data, chunk.meta);
                });
            } else {
                this._worker.on(evt, function () {
                    utils.delay(fn, arguments, self);
                });
            }
            return this;
        },
        /**
         * Resume the flow of chunks.
         * @return {StreamHelper} the current helper.
         */
        resume : function () {
            utils.delay(this._worker.resume, [], this._worker);
            return this;
        },
        /**
         * Pause the flow of chunks.
         * @return {StreamHelper} the current helper.
         */
        pause : function () {
            this._worker.pause();
            return this;
        },
        /**
         * Return a nodejs stream for this helper.
         * @param {Function} updateCb the update callback.
         * @return {NodejsStreamOutputAdapter} the nodejs stream.
         */
        toNodejsStream : function (updateCb) {
            utils.checkSupport("nodestream");
            if (this._outputType !== "nodebuffer") {
                // an object stream containing blob/arraybuffer/uint8array/string
                // is strange and I don't know if it would be useful.
                // I you find this comment and have a good usecase, please open a
                // bug report !
                throw new Error(this._outputType + " is not supported by this method");
            }

            return new NodejsStreamOutputAdapter$1(this, {
                objectMode : this._outputType !== "nodebuffer"
            }, updateCb);
        }
    };


    var StreamHelper_1 = StreamHelper;

    var base64$1 = false;
    var binary = false;
    var dir = false;
    var createFolders = true;
    var date = null;
    var compression = null;
    var compressionOptions = null;
    var comment = null;
    var unixPermissions = null;
    var dosPermissions = null;

    var defaults = {
    	base64: base64$1,
    	binary: binary,
    	dir: dir,
    	createFolders: createFolders,
    	date: date,
    	compression: compression,
    	compressionOptions: compressionOptions,
    	comment: comment,
    	unixPermissions: unixPermissions,
    	dosPermissions: dosPermissions
    };

    // the size of the generated chunks
    // TODO expose this as a public variable
    var DEFAULT_BLOCK_SIZE = 16 * 1024;

    /**
     * A worker that reads a content and emits chunks.
     * @constructor
     * @param {Promise} dataP the promise of the data to split
     */
    function DataWorker(dataP) {
        GenericWorker_1.call(this, "DataWorker");
        var self = this;
        this.dataIsReady = false;
        this.index = 0;
        this.max = 0;
        this.data = null;
        this.type = "";

        this._tickScheduled = false;

        dataP.then(function (data) {
            self.dataIsReady = true;
            self.data = data;
            self.max = data && data.length || 0;
            self.type = utils.getTypeOf(data);
            if(!self.isPaused) {
                self._tickAndRepeat();
            }
        }, function (e) {
            self.error(e);
        });
    }

    utils.inherits(DataWorker, GenericWorker_1);

    /**
     * @see GenericWorker.cleanUp
     */
    DataWorker.prototype.cleanUp = function () {
        GenericWorker_1.prototype.cleanUp.call(this);
        this.data = null;
    };

    /**
     * @see GenericWorker.resume
     */
    DataWorker.prototype.resume = function () {
        if(!GenericWorker_1.prototype.resume.call(this)) {
            return false;
        }

        if (!this._tickScheduled && this.dataIsReady) {
            this._tickScheduled = true;
            utils.delay(this._tickAndRepeat, [], this);
        }
        return true;
    };

    /**
     * Trigger a tick a schedule an other call to this function.
     */
    DataWorker.prototype._tickAndRepeat = function() {
        this._tickScheduled = false;
        if(this.isPaused || this.isFinished) {
            return;
        }
        this._tick();
        if(!this.isFinished) {
            utils.delay(this._tickAndRepeat, [], this);
            this._tickScheduled = true;
        }
    };

    /**
     * Read and push a chunk.
     */
    DataWorker.prototype._tick = function() {

        if(this.isPaused || this.isFinished) {
            return false;
        }

        var size = DEFAULT_BLOCK_SIZE;
        var data = null, nextIndex = Math.min(this.max, this.index + size);
        if (this.index >= this.max) {
            // EOF
            return this.end();
        } else {
            switch(this.type) {
                case "string":
                    data = this.data.substring(this.index, nextIndex);
                break;
                case "uint8array":
                    data = this.data.subarray(this.index, nextIndex);
                break;
                case "array":
                case "nodebuffer":
                    data = this.data.slice(this.index, nextIndex);
                break;
            }
            this.index = nextIndex;
            return this.push({
                data : data,
                meta : {
                    percent : this.max ? this.index / this.max * 100 : 0
                }
            });
        }
    };

    var DataWorker_1 = DataWorker;

    /**
     * A worker which calculate the total length of the data flowing through.
     * @constructor
     * @param {String} propName the name used to expose the length
     */
    function DataLengthProbe(propName) {
        GenericWorker_1.call(this, "DataLengthProbe for " + propName);
        this.propName = propName;
        this.withStreamInfo(propName, 0);
    }
    utils.inherits(DataLengthProbe, GenericWorker_1);

    /**
     * @see GenericWorker.processChunk
     */
    DataLengthProbe.prototype.processChunk = function (chunk) {
        if(chunk) {
            var length = this.streamInfo[this.propName] || 0;
            this.streamInfo[this.propName] = length + chunk.data.length;
        }
        GenericWorker_1.prototype.processChunk.call(this, chunk);
    };
    var DataLengthProbe_1 = DataLengthProbe;

    /**
     * The following functions come from pako, from pako/lib/zlib/crc32.js
     * released under the MIT license, see pako https://github.com/nodeca/pako/
     */

    // Use ordinary array, since untyped makes no boost here
    function makeTable() {
        var c, table = [];

        for(var n =0; n < 256; n++){
            c = n;
            for(var k =0; k < 8; k++){
                c = ((c&1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
            }
            table[n] = c;
        }

        return table;
    }

    // Create table on load. Just 255 signed longs. Not a problem.
    var crcTable = makeTable();


    function crc32(crc, buf, len, pos) {
        var t = crcTable, end = pos + len;

        crc = crc ^ (-1);

        for (var i = pos; i < end; i++ ) {
            crc = (crc >>> 8) ^ t[(crc ^ buf[i]) & 0xFF];
        }

        return (crc ^ (-1)); // >>> 0;
    }

    // That's all for the pako functions.

    /**
     * Compute the crc32 of a string.
     * This is almost the same as the function crc32, but for strings. Using the
     * same function for the two use cases leads to horrible performances.
     * @param {Number} crc the starting value of the crc.
     * @param {String} str the string to use.
     * @param {Number} len the length of the string.
     * @param {Number} pos the starting position for the crc32 computation.
     * @return {Number} the computed crc32.
     */
    function crc32str(crc, str, len, pos) {
        var t = crcTable, end = pos + len;

        crc = crc ^ (-1);

        for (var i = pos; i < end; i++ ) {
            crc = (crc >>> 8) ^ t[(crc ^ str.charCodeAt(i)) & 0xFF];
        }

        return (crc ^ (-1)); // >>> 0;
    }

    var crc32_1 = function crc32wrapper(input, crc) {
        if (typeof input === "undefined" || !input.length) {
            return 0;
        }

        var isArray = utils.getTypeOf(input) !== "string";

        if(isArray) {
            return crc32(crc|0, input, input.length, 0);
        } else {
            return crc32str(crc|0, input, input.length, 0);
        }
    };

    /**
     * A worker which calculate the crc32 of the data flowing through.
     * @constructor
     */
    function Crc32Probe() {
        GenericWorker_1.call(this, "Crc32Probe");
        this.withStreamInfo("crc32", 0);
    }
    utils.inherits(Crc32Probe, GenericWorker_1);

    /**
     * @see GenericWorker.processChunk
     */
    Crc32Probe.prototype.processChunk = function (chunk) {
        this.streamInfo.crc32 = crc32_1(chunk.data, this.streamInfo.crc32 || 0);
        this.push(chunk);
    };
    var Crc32Probe_1 = Crc32Probe;

    /**
     * Represent a compressed object, with everything needed to decompress it.
     * @constructor
     * @param {number} compressedSize the size of the data compressed.
     * @param {number} uncompressedSize the size of the data after decompression.
     * @param {number} crc32 the crc32 of the decompressed file.
     * @param {object} compression the type of compression, see lib/compressions.js.
     * @param {String|ArrayBuffer|Uint8Array|Buffer} data the compressed data.
     */
    function CompressedObject(compressedSize, uncompressedSize, crc32, compression, data) {
        this.compressedSize = compressedSize;
        this.uncompressedSize = uncompressedSize;
        this.crc32 = crc32;
        this.compression = compression;
        this.compressedContent = data;
    }

    CompressedObject.prototype = {
        /**
         * Create a worker to get the uncompressed content.
         * @return {GenericWorker} the worker.
         */
        getContentWorker : function () {
            var worker = new DataWorker_1(external.Promise.resolve(this.compressedContent))
            .pipe(this.compression.uncompressWorker())
            .pipe(new DataLengthProbe_1("data_length"));

            var that = this;
            worker.on("end", function () {
                if(this.streamInfo['data_length'] !== that.uncompressedSize) {
                    throw new Error("Bug : uncompressed data size mismatch");
                }
            });
            return worker;
        },
        /**
         * Create a worker to get the compressed content.
         * @return {GenericWorker} the worker.
         */
        getCompressedWorker : function () {
            return new DataWorker_1(external.Promise.resolve(this.compressedContent))
            .withStreamInfo("compressedSize", this.compressedSize)
            .withStreamInfo("uncompressedSize", this.uncompressedSize)
            .withStreamInfo("crc32", this.crc32)
            .withStreamInfo("compression", this.compression)
            ;
        }
    };

    /**
     * Chain the given worker with other workers to compress the content with the
     * given compression.
     * @param {GenericWorker} uncompressedWorker the worker to pipe.
     * @param {Object} compression the compression object.
     * @param {Object} compressionOptions the options to use when compressing.
     * @return {GenericWorker} the new worker compressing the content.
     */
    CompressedObject.createWorkerFrom = function (uncompressedWorker, compression, compressionOptions) {
        return uncompressedWorker
        .pipe(new Crc32Probe_1())
        .pipe(new DataLengthProbe_1("uncompressedSize"))
        .pipe(compression.compressWorker(compressionOptions))
        .pipe(new DataLengthProbe_1("compressedSize"))
        .withStreamInfo("compression", compression);
    };

    var compressedObject = CompressedObject;

    /**
     * A simple object representing a file in the zip file.
     * @constructor
     * @param {string} name the name of the file
     * @param {String|ArrayBuffer|Uint8Array|Buffer} data the data
     * @param {Object} options the options of the file
     */
    var ZipObject = function(name, data, options) {
        this.name = name;
        this.dir = options.dir;
        this.date = options.date;
        this.comment = options.comment;
        this.unixPermissions = options.unixPermissions;
        this.dosPermissions = options.dosPermissions;

        this._data = data;
        this._dataBinary = options.binary;
        // keep only the compression
        this.options = {
            compression : options.compression,
            compressionOptions : options.compressionOptions
        };
    };

    ZipObject.prototype = {
        /**
         * Create an internal stream for the content of this object.
         * @param {String} type the type of each chunk.
         * @return StreamHelper the stream.
         */
        internalStream: function (type) {
            var result = null, outputType = "string";
            try {
                if (!type) {
                    throw new Error("No output type specified.");
                }
                outputType = type.toLowerCase();
                var askUnicodeString = outputType === "string" || outputType === "text";
                if (outputType === "binarystring" || outputType === "text") {
                    outputType = "string";
                }
                result = this._decompressWorker();

                var isUnicodeString = !this._dataBinary;

                if (isUnicodeString && !askUnicodeString) {
                    result = result.pipe(new utf8.Utf8EncodeWorker());
                }
                if (!isUnicodeString && askUnicodeString) {
                    result = result.pipe(new utf8.Utf8DecodeWorker());
                }
            } catch (e) {
                result = new GenericWorker_1("error");
                result.error(e);
            }

            return new StreamHelper_1(result, outputType, "");
        },

        /**
         * Prepare the content in the asked type.
         * @param {String} type the type of the result.
         * @param {Function} onUpdate a function to call on each internal update.
         * @return Promise the promise of the result.
         */
        async: function (type, onUpdate) {
            return this.internalStream(type).accumulate(onUpdate);
        },

        /**
         * Prepare the content as a nodejs stream.
         * @param {String} type the type of each chunk.
         * @param {Function} onUpdate a function to call on each internal update.
         * @return Stream the stream.
         */
        nodeStream: function (type, onUpdate) {
            return this.internalStream(type || "nodebuffer").toNodejsStream(onUpdate);
        },

        /**
         * Return a worker for the compressed content.
         * @private
         * @param {Object} compression the compression object to use.
         * @param {Object} compressionOptions the options to use when compressing.
         * @return Worker the worker.
         */
        _compressWorker: function (compression, compressionOptions) {
            if (
                this._data instanceof compressedObject &&
                this._data.compression.magic === compression.magic
            ) {
                return this._data.getCompressedWorker();
            } else {
                var result = this._decompressWorker();
                if(!this._dataBinary) {
                    result = result.pipe(new utf8.Utf8EncodeWorker());
                }
                return compressedObject.createWorkerFrom(result, compression, compressionOptions);
            }
        },
        /**
         * Return a worker for the decompressed content.
         * @private
         * @return Worker the worker.
         */
        _decompressWorker : function () {
            if (this._data instanceof compressedObject) {
                return this._data.getContentWorker();
            } else if (this._data instanceof GenericWorker_1) {
                return this._data;
            } else {
                return new DataWorker_1(this._data);
            }
        }
    };

    var removedMethods = ["asText", "asBinary", "asNodeBuffer", "asUint8Array", "asArrayBuffer"];
    var removedFn = function () {
        throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
    };

    for(var i = 0; i < removedMethods.length; i++) {
        ZipObject.prototype[removedMethods[i]] = removedFn;
    }
    var zipObject = ZipObject;

    var common = createCommonjsModule(function (module, exports) {


    var TYPED_OK =  (typeof Uint8Array !== 'undefined') &&
                    (typeof Uint16Array !== 'undefined') &&
                    (typeof Int32Array !== 'undefined');

    function _has(obj, key) {
      return Object.prototype.hasOwnProperty.call(obj, key);
    }

    exports.assign = function (obj /*from1, from2, from3, ...*/) {
      var sources = Array.prototype.slice.call(arguments, 1);
      while (sources.length) {
        var source = sources.shift();
        if (!source) { continue; }

        if (typeof source !== 'object') {
          throw new TypeError(source + 'must be non-object');
        }

        for (var p in source) {
          if (_has(source, p)) {
            obj[p] = source[p];
          }
        }
      }

      return obj;
    };


    // reduce buffer size, avoiding mem copy
    exports.shrinkBuf = function (buf, size) {
      if (buf.length === size) { return buf; }
      if (buf.subarray) { return buf.subarray(0, size); }
      buf.length = size;
      return buf;
    };


    var fnTyped = {
      arraySet: function (dest, src, src_offs, len, dest_offs) {
        if (src.subarray && dest.subarray) {
          dest.set(src.subarray(src_offs, src_offs + len), dest_offs);
          return;
        }
        // Fallback to ordinary array
        for (var i = 0; i < len; i++) {
          dest[dest_offs + i] = src[src_offs + i];
        }
      },
      // Join array of chunks to single array.
      flattenChunks: function (chunks) {
        var i, l, len, pos, chunk, result;

        // calculate data length
        len = 0;
        for (i = 0, l = chunks.length; i < l; i++) {
          len += chunks[i].length;
        }

        // join chunks
        result = new Uint8Array(len);
        pos = 0;
        for (i = 0, l = chunks.length; i < l; i++) {
          chunk = chunks[i];
          result.set(chunk, pos);
          pos += chunk.length;
        }

        return result;
      }
    };

    var fnUntyped = {
      arraySet: function (dest, src, src_offs, len, dest_offs) {
        for (var i = 0; i < len; i++) {
          dest[dest_offs + i] = src[src_offs + i];
        }
      },
      // Join array of chunks to single array.
      flattenChunks: function (chunks) {
        return [].concat.apply([], chunks);
      }
    };


    // Enable/Disable typed arrays use, for testing
    //
    exports.setTyped = function (on) {
      if (on) {
        exports.Buf8  = Uint8Array;
        exports.Buf16 = Uint16Array;
        exports.Buf32 = Int32Array;
        exports.assign(exports, fnTyped);
      } else {
        exports.Buf8  = Array;
        exports.Buf16 = Array;
        exports.Buf32 = Array;
        exports.assign(exports, fnUntyped);
      }
    };

    exports.setTyped(TYPED_OK);
    });

    // (C) 1995-2013 Jean-loup Gailly and Mark Adler
    // (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
    //
    // This software is provided 'as-is', without any express or implied
    // warranty. In no event will the authors be held liable for any damages
    // arising from the use of this software.
    //
    // Permission is granted to anyone to use this software for any purpose,
    // including commercial applications, and to alter it and redistribute it
    // freely, subject to the following restrictions:
    //
    // 1. The origin of this software must not be misrepresented; you must not
    //   claim that you wrote the original software. If you use this software
    //   in a product, an acknowledgment in the product documentation would be
    //   appreciated but is not required.
    // 2. Altered source versions must be plainly marked as such, and must not be
    //   misrepresented as being the original software.
    // 3. This notice may not be removed or altered from any source distribution.

    /* eslint-disable space-unary-ops */



    /* Public constants ==========================================================*/
    /* ===========================================================================*/


    //var Z_FILTERED          = 1;
    //var Z_HUFFMAN_ONLY      = 2;
    //var Z_RLE               = 3;
    var Z_FIXED               = 4;
    //var Z_DEFAULT_STRATEGY  = 0;

    /* Possible values of the data_type field (though see inflate()) */
    var Z_BINARY              = 0;
    var Z_TEXT                = 1;
    //var Z_ASCII             = 1; // = Z_TEXT
    var Z_UNKNOWN             = 2;

    /*============================================================================*/


    function zero(buf) { var len = buf.length; while (--len >= 0) { buf[len] = 0; } }

    // From zutil.h

    var STORED_BLOCK = 0;
    var STATIC_TREES = 1;
    var DYN_TREES    = 2;
    /* The three kinds of block type */

    var MIN_MATCH    = 3;
    var MAX_MATCH    = 258;
    /* The minimum and maximum match lengths */

    // From deflate.h
    /* ===========================================================================
     * Internal compression state.
     */

    var LENGTH_CODES  = 29;
    /* number of length codes, not counting the special END_BLOCK code */

    var LITERALS      = 256;
    /* number of literal bytes 0..255 */

    var L_CODES       = LITERALS + 1 + LENGTH_CODES;
    /* number of Literal or Length codes, including the END_BLOCK code */

    var D_CODES       = 30;
    /* number of distance codes */

    var BL_CODES      = 19;
    /* number of codes used to transfer the bit lengths */

    var HEAP_SIZE     = 2 * L_CODES + 1;
    /* maximum heap size */

    var MAX_BITS      = 15;
    /* All codes must not exceed MAX_BITS bits */

    var Buf_size      = 16;
    /* size of bit buffer in bi_buf */


    /* ===========================================================================
     * Constants
     */

    var MAX_BL_BITS = 7;
    /* Bit length codes must not exceed MAX_BL_BITS bits */

    var END_BLOCK   = 256;
    /* end of block literal code */

    var REP_3_6     = 16;
    /* repeat previous bit length 3-6 times (2 bits of repeat count) */

    var REPZ_3_10   = 17;
    /* repeat a zero length 3-10 times  (3 bits of repeat count) */

    var REPZ_11_138 = 18;
    /* repeat a zero length 11-138 times  (7 bits of repeat count) */

    /* eslint-disable comma-spacing,array-bracket-spacing */
    var extra_lbits =   /* extra bits for each length code */
      [0,0,0,0,0,0,0,0,1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0];

    var extra_dbits =   /* extra bits for each distance code */
      [0,0,0,0,1,1,2,2,3,3,4,4,5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13];

    var extra_blbits =  /* extra bits for each bit length code */
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,3,7];

    var bl_order =
      [16,17,18,0,8,7,9,6,10,5,11,4,12,3,13,2,14,1,15];
    /* eslint-enable comma-spacing,array-bracket-spacing */

    /* The lengths of the bit length codes are sent in order of decreasing
     * probability, to avoid transmitting the lengths for unused bit length codes.
     */

    /* ===========================================================================
     * Local data. These are initialized only once.
     */

    // We pre-fill arrays with 0 to avoid uninitialized gaps

    var DIST_CODE_LEN = 512; /* see definition of array dist_code below */

    // !!!! Use flat array instead of structure, Freq = i*2, Len = i*2+1
    var static_ltree  = new Array((L_CODES + 2) * 2);
    zero(static_ltree);
    /* The static literal tree. Since the bit lengths are imposed, there is no
     * need for the L_CODES extra codes used during heap construction. However
     * The codes 286 and 287 are needed to build a canonical tree (see _tr_init
     * below).
     */

    var static_dtree  = new Array(D_CODES * 2);
    zero(static_dtree);
    /* The static distance tree. (Actually a trivial tree since all codes use
     * 5 bits.)
     */

    var _dist_code    = new Array(DIST_CODE_LEN);
    zero(_dist_code);
    /* Distance codes. The first 256 values correspond to the distances
     * 3 .. 258, the last 256 values correspond to the top 8 bits of
     * the 15 bit distances.
     */

    var _length_code  = new Array(MAX_MATCH - MIN_MATCH + 1);
    zero(_length_code);
    /* length code for each normalized match length (0 == MIN_MATCH) */

    var base_length   = new Array(LENGTH_CODES);
    zero(base_length);
    /* First normalized length for each code (0 = MIN_MATCH) */

    var base_dist     = new Array(D_CODES);
    zero(base_dist);
    /* First normalized distance for each code (0 = distance of 1) */


    function StaticTreeDesc(static_tree, extra_bits, extra_base, elems, max_length) {

      this.static_tree  = static_tree;  /* static tree or NULL */
      this.extra_bits   = extra_bits;   /* extra bits for each code or NULL */
      this.extra_base   = extra_base;   /* base index for extra_bits */
      this.elems        = elems;        /* max number of elements in the tree */
      this.max_length   = max_length;   /* max bit length for the codes */

      // show if `static_tree` has data or dummy - needed for monomorphic objects
      this.has_stree    = static_tree && static_tree.length;
    }


    var static_l_desc;
    var static_d_desc;
    var static_bl_desc;


    function TreeDesc(dyn_tree, stat_desc) {
      this.dyn_tree = dyn_tree;     /* the dynamic tree */
      this.max_code = 0;            /* largest code with non zero frequency */
      this.stat_desc = stat_desc;   /* the corresponding static tree */
    }



    function d_code(dist) {
      return dist < 256 ? _dist_code[dist] : _dist_code[256 + (dist >>> 7)];
    }


    /* ===========================================================================
     * Output a short LSB first on the stream.
     * IN assertion: there is enough room in pendingBuf.
     */
    function put_short(s, w) {
    //    put_byte(s, (uch)((w) & 0xff));
    //    put_byte(s, (uch)((ush)(w) >> 8));
      s.pending_buf[s.pending++] = (w) & 0xff;
      s.pending_buf[s.pending++] = (w >>> 8) & 0xff;
    }


    /* ===========================================================================
     * Send a value on a given number of bits.
     * IN assertion: length <= 16 and value fits in length bits.
     */
    function send_bits(s, value, length) {
      if (s.bi_valid > (Buf_size - length)) {
        s.bi_buf |= (value << s.bi_valid) & 0xffff;
        put_short(s, s.bi_buf);
        s.bi_buf = value >> (Buf_size - s.bi_valid);
        s.bi_valid += length - Buf_size;
      } else {
        s.bi_buf |= (value << s.bi_valid) & 0xffff;
        s.bi_valid += length;
      }
    }


    function send_code(s, c, tree) {
      send_bits(s, tree[c * 2]/*.Code*/, tree[c * 2 + 1]/*.Len*/);
    }


    /* ===========================================================================
     * Reverse the first len bits of a code, using straightforward code (a faster
     * method would use a table)
     * IN assertion: 1 <= len <= 15
     */
    function bi_reverse(code, len) {
      var res = 0;
      do {
        res |= code & 1;
        code >>>= 1;
        res <<= 1;
      } while (--len > 0);
      return res >>> 1;
    }


    /* ===========================================================================
     * Flush the bit buffer, keeping at most 7 bits in it.
     */
    function bi_flush(s) {
      if (s.bi_valid === 16) {
        put_short(s, s.bi_buf);
        s.bi_buf = 0;
        s.bi_valid = 0;

      } else if (s.bi_valid >= 8) {
        s.pending_buf[s.pending++] = s.bi_buf & 0xff;
        s.bi_buf >>= 8;
        s.bi_valid -= 8;
      }
    }


    /* ===========================================================================
     * Compute the optimal bit lengths for a tree and update the total bit length
     * for the current block.
     * IN assertion: the fields freq and dad are set, heap[heap_max] and
     *    above are the tree nodes sorted by increasing frequency.
     * OUT assertions: the field len is set to the optimal bit length, the
     *     array bl_count contains the frequencies for each bit length.
     *     The length opt_len is updated; static_len is also updated if stree is
     *     not null.
     */
    function gen_bitlen(s, desc)
    //    deflate_state *s;
    //    tree_desc *desc;    /* the tree descriptor */
    {
      var tree            = desc.dyn_tree;
      var max_code        = desc.max_code;
      var stree           = desc.stat_desc.static_tree;
      var has_stree       = desc.stat_desc.has_stree;
      var extra           = desc.stat_desc.extra_bits;
      var base            = desc.stat_desc.extra_base;
      var max_length      = desc.stat_desc.max_length;
      var h;              /* heap index */
      var n, m;           /* iterate over the tree elements */
      var bits;           /* bit length */
      var xbits;          /* extra bits */
      var f;              /* frequency */
      var overflow = 0;   /* number of elements with bit length too large */

      for (bits = 0; bits <= MAX_BITS; bits++) {
        s.bl_count[bits] = 0;
      }

      /* In a first pass, compute the optimal bit lengths (which may
       * overflow in the case of the bit length tree).
       */
      tree[s.heap[s.heap_max] * 2 + 1]/*.Len*/ = 0; /* root of the heap */

      for (h = s.heap_max + 1; h < HEAP_SIZE; h++) {
        n = s.heap[h];
        bits = tree[tree[n * 2 + 1]/*.Dad*/ * 2 + 1]/*.Len*/ + 1;
        if (bits > max_length) {
          bits = max_length;
          overflow++;
        }
        tree[n * 2 + 1]/*.Len*/ = bits;
        /* We overwrite tree[n].Dad which is no longer needed */

        if (n > max_code) { continue; } /* not a leaf node */

        s.bl_count[bits]++;
        xbits = 0;
        if (n >= base) {
          xbits = extra[n - base];
        }
        f = tree[n * 2]/*.Freq*/;
        s.opt_len += f * (bits + xbits);
        if (has_stree) {
          s.static_len += f * (stree[n * 2 + 1]/*.Len*/ + xbits);
        }
      }
      if (overflow === 0) { return; }

      // Trace((stderr,"\nbit length overflow\n"));
      /* This happens for example on obj2 and pic of the Calgary corpus */

      /* Find the first bit length which could increase: */
      do {
        bits = max_length - 1;
        while (s.bl_count[bits] === 0) { bits--; }
        s.bl_count[bits]--;      /* move one leaf down the tree */
        s.bl_count[bits + 1] += 2; /* move one overflow item as its brother */
        s.bl_count[max_length]--;
        /* The brother of the overflow item also moves one step up,
         * but this does not affect bl_count[max_length]
         */
        overflow -= 2;
      } while (overflow > 0);

      /* Now recompute all bit lengths, scanning in increasing frequency.
       * h is still equal to HEAP_SIZE. (It is simpler to reconstruct all
       * lengths instead of fixing only the wrong ones. This idea is taken
       * from 'ar' written by Haruhiko Okumura.)
       */
      for (bits = max_length; bits !== 0; bits--) {
        n = s.bl_count[bits];
        while (n !== 0) {
          m = s.heap[--h];
          if (m > max_code) { continue; }
          if (tree[m * 2 + 1]/*.Len*/ !== bits) {
            // Trace((stderr,"code %d bits %d->%d\n", m, tree[m].Len, bits));
            s.opt_len += (bits - tree[m * 2 + 1]/*.Len*/) * tree[m * 2]/*.Freq*/;
            tree[m * 2 + 1]/*.Len*/ = bits;
          }
          n--;
        }
      }
    }


    /* ===========================================================================
     * Generate the codes for a given tree and bit counts (which need not be
     * optimal).
     * IN assertion: the array bl_count contains the bit length statistics for
     * the given tree and the field len is set for all tree elements.
     * OUT assertion: the field code is set for all tree elements of non
     *     zero code length.
     */
    function gen_codes(tree, max_code, bl_count)
    //    ct_data *tree;             /* the tree to decorate */
    //    int max_code;              /* largest code with non zero frequency */
    //    ushf *bl_count;            /* number of codes at each bit length */
    {
      var next_code = new Array(MAX_BITS + 1); /* next code value for each bit length */
      var code = 0;              /* running code value */
      var bits;                  /* bit index */
      var n;                     /* code index */

      /* The distribution counts are first used to generate the code values
       * without bit reversal.
       */
      for (bits = 1; bits <= MAX_BITS; bits++) {
        next_code[bits] = code = (code + bl_count[bits - 1]) << 1;
      }
      /* Check that the bit counts in bl_count are consistent. The last code
       * must be all ones.
       */
      //Assert (code + bl_count[MAX_BITS]-1 == (1<<MAX_BITS)-1,
      //        "inconsistent bit counts");
      //Tracev((stderr,"\ngen_codes: max_code %d ", max_code));

      for (n = 0;  n <= max_code; n++) {
        var len = tree[n * 2 + 1]/*.Len*/;
        if (len === 0) { continue; }
        /* Now reverse the bits */
        tree[n * 2]/*.Code*/ = bi_reverse(next_code[len]++, len);

        //Tracecv(tree != static_ltree, (stderr,"\nn %3d %c l %2d c %4x (%x) ",
        //     n, (isgraph(n) ? n : ' '), len, tree[n].Code, next_code[len]-1));
      }
    }


    /* ===========================================================================
     * Initialize the various 'constant' tables.
     */
    function tr_static_init() {
      var n;        /* iterates over tree elements */
      var bits;     /* bit counter */
      var length;   /* length value */
      var code;     /* code value */
      var dist;     /* distance index */
      var bl_count = new Array(MAX_BITS + 1);
      /* number of codes at each bit length for an optimal tree */

      // do check in _tr_init()
      //if (static_init_done) return;

      /* For some embedded targets, global variables are not initialized: */
    /*#ifdef NO_INIT_GLOBAL_POINTERS
      static_l_desc.static_tree = static_ltree;
      static_l_desc.extra_bits = extra_lbits;
      static_d_desc.static_tree = static_dtree;
      static_d_desc.extra_bits = extra_dbits;
      static_bl_desc.extra_bits = extra_blbits;
    #endif*/

      /* Initialize the mapping length (0..255) -> length code (0..28) */
      length = 0;
      for (code = 0; code < LENGTH_CODES - 1; code++) {
        base_length[code] = length;
        for (n = 0; n < (1 << extra_lbits[code]); n++) {
          _length_code[length++] = code;
        }
      }
      //Assert (length == 256, "tr_static_init: length != 256");
      /* Note that the length 255 (match length 258) can be represented
       * in two different ways: code 284 + 5 bits or code 285, so we
       * overwrite length_code[255] to use the best encoding:
       */
      _length_code[length - 1] = code;

      /* Initialize the mapping dist (0..32K) -> dist code (0..29) */
      dist = 0;
      for (code = 0; code < 16; code++) {
        base_dist[code] = dist;
        for (n = 0; n < (1 << extra_dbits[code]); n++) {
          _dist_code[dist++] = code;
        }
      }
      //Assert (dist == 256, "tr_static_init: dist != 256");
      dist >>= 7; /* from now on, all distances are divided by 128 */
      for (; code < D_CODES; code++) {
        base_dist[code] = dist << 7;
        for (n = 0; n < (1 << (extra_dbits[code] - 7)); n++) {
          _dist_code[256 + dist++] = code;
        }
      }
      //Assert (dist == 256, "tr_static_init: 256+dist != 512");

      /* Construct the codes of the static literal tree */
      for (bits = 0; bits <= MAX_BITS; bits++) {
        bl_count[bits] = 0;
      }

      n = 0;
      while (n <= 143) {
        static_ltree[n * 2 + 1]/*.Len*/ = 8;
        n++;
        bl_count[8]++;
      }
      while (n <= 255) {
        static_ltree[n * 2 + 1]/*.Len*/ = 9;
        n++;
        bl_count[9]++;
      }
      while (n <= 279) {
        static_ltree[n * 2 + 1]/*.Len*/ = 7;
        n++;
        bl_count[7]++;
      }
      while (n <= 287) {
        static_ltree[n * 2 + 1]/*.Len*/ = 8;
        n++;
        bl_count[8]++;
      }
      /* Codes 286 and 287 do not exist, but we must include them in the
       * tree construction to get a canonical Huffman tree (longest code
       * all ones)
       */
      gen_codes(static_ltree, L_CODES + 1, bl_count);

      /* The static distance tree is trivial: */
      for (n = 0; n < D_CODES; n++) {
        static_dtree[n * 2 + 1]/*.Len*/ = 5;
        static_dtree[n * 2]/*.Code*/ = bi_reverse(n, 5);
      }

      // Now data ready and we can init static trees
      static_l_desc = new StaticTreeDesc(static_ltree, extra_lbits, LITERALS + 1, L_CODES, MAX_BITS);
      static_d_desc = new StaticTreeDesc(static_dtree, extra_dbits, 0,          D_CODES, MAX_BITS);
      static_bl_desc = new StaticTreeDesc(new Array(0), extra_blbits, 0,         BL_CODES, MAX_BL_BITS);

      //static_init_done = true;
    }


    /* ===========================================================================
     * Initialize a new block.
     */
    function init_block(s) {
      var n; /* iterates over tree elements */

      /* Initialize the trees. */
      for (n = 0; n < L_CODES;  n++) { s.dyn_ltree[n * 2]/*.Freq*/ = 0; }
      for (n = 0; n < D_CODES;  n++) { s.dyn_dtree[n * 2]/*.Freq*/ = 0; }
      for (n = 0; n < BL_CODES; n++) { s.bl_tree[n * 2]/*.Freq*/ = 0; }

      s.dyn_ltree[END_BLOCK * 2]/*.Freq*/ = 1;
      s.opt_len = s.static_len = 0;
      s.last_lit = s.matches = 0;
    }


    /* ===========================================================================
     * Flush the bit buffer and align the output on a byte boundary
     */
    function bi_windup(s)
    {
      if (s.bi_valid > 8) {
        put_short(s, s.bi_buf);
      } else if (s.bi_valid > 0) {
        //put_byte(s, (Byte)s->bi_buf);
        s.pending_buf[s.pending++] = s.bi_buf;
      }
      s.bi_buf = 0;
      s.bi_valid = 0;
    }

    /* ===========================================================================
     * Copy a stored block, storing first the length and its
     * one's complement if requested.
     */
    function copy_block(s, buf, len, header)
    //DeflateState *s;
    //charf    *buf;    /* the input data */
    //unsigned len;     /* its length */
    //int      header;  /* true if block header must be written */
    {
      bi_windup(s);        /* align on byte boundary */

      if (header) {
        put_short(s, len);
        put_short(s, ~len);
      }
    //  while (len--) {
    //    put_byte(s, *buf++);
    //  }
      common.arraySet(s.pending_buf, s.window, buf, len, s.pending);
      s.pending += len;
    }

    /* ===========================================================================
     * Compares to subtrees, using the tree depth as tie breaker when
     * the subtrees have equal frequency. This minimizes the worst case length.
     */
    function smaller(tree, n, m, depth) {
      var _n2 = n * 2;
      var _m2 = m * 2;
      return (tree[_n2]/*.Freq*/ < tree[_m2]/*.Freq*/ ||
             (tree[_n2]/*.Freq*/ === tree[_m2]/*.Freq*/ && depth[n] <= depth[m]));
    }

    /* ===========================================================================
     * Restore the heap property by moving down the tree starting at node k,
     * exchanging a node with the smallest of its two sons if necessary, stopping
     * when the heap property is re-established (each father smaller than its
     * two sons).
     */
    function pqdownheap(s, tree, k)
    //    deflate_state *s;
    //    ct_data *tree;  /* the tree to restore */
    //    int k;               /* node to move down */
    {
      var v = s.heap[k];
      var j = k << 1;  /* left son of k */
      while (j <= s.heap_len) {
        /* Set j to the smallest of the two sons: */
        if (j < s.heap_len &&
          smaller(tree, s.heap[j + 1], s.heap[j], s.depth)) {
          j++;
        }
        /* Exit if v is smaller than both sons */
        if (smaller(tree, v, s.heap[j], s.depth)) { break; }

        /* Exchange v with the smallest son */
        s.heap[k] = s.heap[j];
        k = j;

        /* And continue down the tree, setting j to the left son of k */
        j <<= 1;
      }
      s.heap[k] = v;
    }


    // inlined manually
    // var SMALLEST = 1;

    /* ===========================================================================
     * Send the block data compressed using the given Huffman trees
     */
    function compress_block(s, ltree, dtree)
    //    deflate_state *s;
    //    const ct_data *ltree; /* literal tree */
    //    const ct_data *dtree; /* distance tree */
    {
      var dist;           /* distance of matched string */
      var lc;             /* match length or unmatched char (if dist == 0) */
      var lx = 0;         /* running index in l_buf */
      var code;           /* the code to send */
      var extra;          /* number of extra bits to send */

      if (s.last_lit !== 0) {
        do {
          dist = (s.pending_buf[s.d_buf + lx * 2] << 8) | (s.pending_buf[s.d_buf + lx * 2 + 1]);
          lc = s.pending_buf[s.l_buf + lx];
          lx++;

          if (dist === 0) {
            send_code(s, lc, ltree); /* send a literal byte */
            //Tracecv(isgraph(lc), (stderr," '%c' ", lc));
          } else {
            /* Here, lc is the match length - MIN_MATCH */
            code = _length_code[lc];
            send_code(s, code + LITERALS + 1, ltree); /* send the length code */
            extra = extra_lbits[code];
            if (extra !== 0) {
              lc -= base_length[code];
              send_bits(s, lc, extra);       /* send the extra length bits */
            }
            dist--; /* dist is now the match distance - 1 */
            code = d_code(dist);
            //Assert (code < D_CODES, "bad d_code");

            send_code(s, code, dtree);       /* send the distance code */
            extra = extra_dbits[code];
            if (extra !== 0) {
              dist -= base_dist[code];
              send_bits(s, dist, extra);   /* send the extra distance bits */
            }
          } /* literal or match pair ? */

          /* Check that the overlay between pending_buf and d_buf+l_buf is ok: */
          //Assert((uInt)(s->pending) < s->lit_bufsize + 2*lx,
          //       "pendingBuf overflow");

        } while (lx < s.last_lit);
      }

      send_code(s, END_BLOCK, ltree);
    }


    /* ===========================================================================
     * Construct one Huffman tree and assigns the code bit strings and lengths.
     * Update the total bit length for the current block.
     * IN assertion: the field freq is set for all tree elements.
     * OUT assertions: the fields len and code are set to the optimal bit length
     *     and corresponding code. The length opt_len is updated; static_len is
     *     also updated if stree is not null. The field max_code is set.
     */
    function build_tree(s, desc)
    //    deflate_state *s;
    //    tree_desc *desc; /* the tree descriptor */
    {
      var tree     = desc.dyn_tree;
      var stree    = desc.stat_desc.static_tree;
      var has_stree = desc.stat_desc.has_stree;
      var elems    = desc.stat_desc.elems;
      var n, m;          /* iterate over heap elements */
      var max_code = -1; /* largest code with non zero frequency */
      var node;          /* new node being created */

      /* Construct the initial heap, with least frequent element in
       * heap[SMALLEST]. The sons of heap[n] are heap[2*n] and heap[2*n+1].
       * heap[0] is not used.
       */
      s.heap_len = 0;
      s.heap_max = HEAP_SIZE;

      for (n = 0; n < elems; n++) {
        if (tree[n * 2]/*.Freq*/ !== 0) {
          s.heap[++s.heap_len] = max_code = n;
          s.depth[n] = 0;

        } else {
          tree[n * 2 + 1]/*.Len*/ = 0;
        }
      }

      /* The pkzip format requires that at least one distance code exists,
       * and that at least one bit should be sent even if there is only one
       * possible code. So to avoid special checks later on we force at least
       * two codes of non zero frequency.
       */
      while (s.heap_len < 2) {
        node = s.heap[++s.heap_len] = (max_code < 2 ? ++max_code : 0);
        tree[node * 2]/*.Freq*/ = 1;
        s.depth[node] = 0;
        s.opt_len--;

        if (has_stree) {
          s.static_len -= stree[node * 2 + 1]/*.Len*/;
        }
        /* node is 0 or 1 so it does not have extra bits */
      }
      desc.max_code = max_code;

      /* The elements heap[heap_len/2+1 .. heap_len] are leaves of the tree,
       * establish sub-heaps of increasing lengths:
       */
      for (n = (s.heap_len >> 1/*int /2*/); n >= 1; n--) { pqdownheap(s, tree, n); }

      /* Construct the Huffman tree by repeatedly combining the least two
       * frequent nodes.
       */
      node = elems;              /* next internal node of the tree */
      do {
        //pqremove(s, tree, n);  /* n = node of least frequency */
        /*** pqremove ***/
        n = s.heap[1/*SMALLEST*/];
        s.heap[1/*SMALLEST*/] = s.heap[s.heap_len--];
        pqdownheap(s, tree, 1/*SMALLEST*/);
        /***/

        m = s.heap[1/*SMALLEST*/]; /* m = node of next least frequency */

        s.heap[--s.heap_max] = n; /* keep the nodes sorted by frequency */
        s.heap[--s.heap_max] = m;

        /* Create a new node father of n and m */
        tree[node * 2]/*.Freq*/ = tree[n * 2]/*.Freq*/ + tree[m * 2]/*.Freq*/;
        s.depth[node] = (s.depth[n] >= s.depth[m] ? s.depth[n] : s.depth[m]) + 1;
        tree[n * 2 + 1]/*.Dad*/ = tree[m * 2 + 1]/*.Dad*/ = node;

        /* and insert the new node in the heap */
        s.heap[1/*SMALLEST*/] = node++;
        pqdownheap(s, tree, 1/*SMALLEST*/);

      } while (s.heap_len >= 2);

      s.heap[--s.heap_max] = s.heap[1/*SMALLEST*/];

      /* At this point, the fields freq and dad are set. We can now
       * generate the bit lengths.
       */
      gen_bitlen(s, desc);

      /* The field len is now set, we can generate the bit codes */
      gen_codes(tree, max_code, s.bl_count);
    }


    /* ===========================================================================
     * Scan a literal or distance tree to determine the frequencies of the codes
     * in the bit length tree.
     */
    function scan_tree(s, tree, max_code)
    //    deflate_state *s;
    //    ct_data *tree;   /* the tree to be scanned */
    //    int max_code;    /* and its largest code of non zero frequency */
    {
      var n;                     /* iterates over all tree elements */
      var prevlen = -1;          /* last emitted length */
      var curlen;                /* length of current code */

      var nextlen = tree[0 * 2 + 1]/*.Len*/; /* length of next code */

      var count = 0;             /* repeat count of the current code */
      var max_count = 7;         /* max repeat count */
      var min_count = 4;         /* min repeat count */

      if (nextlen === 0) {
        max_count = 138;
        min_count = 3;
      }
      tree[(max_code + 1) * 2 + 1]/*.Len*/ = 0xffff; /* guard */

      for (n = 0; n <= max_code; n++) {
        curlen = nextlen;
        nextlen = tree[(n + 1) * 2 + 1]/*.Len*/;

        if (++count < max_count && curlen === nextlen) {
          continue;

        } else if (count < min_count) {
          s.bl_tree[curlen * 2]/*.Freq*/ += count;

        } else if (curlen !== 0) {

          if (curlen !== prevlen) { s.bl_tree[curlen * 2]/*.Freq*/++; }
          s.bl_tree[REP_3_6 * 2]/*.Freq*/++;

        } else if (count <= 10) {
          s.bl_tree[REPZ_3_10 * 2]/*.Freq*/++;

        } else {
          s.bl_tree[REPZ_11_138 * 2]/*.Freq*/++;
        }

        count = 0;
        prevlen = curlen;

        if (nextlen === 0) {
          max_count = 138;
          min_count = 3;

        } else if (curlen === nextlen) {
          max_count = 6;
          min_count = 3;

        } else {
          max_count = 7;
          min_count = 4;
        }
      }
    }


    /* ===========================================================================
     * Send a literal or distance tree in compressed form, using the codes in
     * bl_tree.
     */
    function send_tree(s, tree, max_code)
    //    deflate_state *s;
    //    ct_data *tree; /* the tree to be scanned */
    //    int max_code;       /* and its largest code of non zero frequency */
    {
      var n;                     /* iterates over all tree elements */
      var prevlen = -1;          /* last emitted length */
      var curlen;                /* length of current code */

      var nextlen = tree[0 * 2 + 1]/*.Len*/; /* length of next code */

      var count = 0;             /* repeat count of the current code */
      var max_count = 7;         /* max repeat count */
      var min_count = 4;         /* min repeat count */

      /* tree[max_code+1].Len = -1; */  /* guard already set */
      if (nextlen === 0) {
        max_count = 138;
        min_count = 3;
      }

      for (n = 0; n <= max_code; n++) {
        curlen = nextlen;
        nextlen = tree[(n + 1) * 2 + 1]/*.Len*/;

        if (++count < max_count && curlen === nextlen) {
          continue;

        } else if (count < min_count) {
          do { send_code(s, curlen, s.bl_tree); } while (--count !== 0);

        } else if (curlen !== 0) {
          if (curlen !== prevlen) {
            send_code(s, curlen, s.bl_tree);
            count--;
          }
          //Assert(count >= 3 && count <= 6, " 3_6?");
          send_code(s, REP_3_6, s.bl_tree);
          send_bits(s, count - 3, 2);

        } else if (count <= 10) {
          send_code(s, REPZ_3_10, s.bl_tree);
          send_bits(s, count - 3, 3);

        } else {
          send_code(s, REPZ_11_138, s.bl_tree);
          send_bits(s, count - 11, 7);
        }

        count = 0;
        prevlen = curlen;
        if (nextlen === 0) {
          max_count = 138;
          min_count = 3;

        } else if (curlen === nextlen) {
          max_count = 6;
          min_count = 3;

        } else {
          max_count = 7;
          min_count = 4;
        }
      }
    }


    /* ===========================================================================
     * Construct the Huffman tree for the bit lengths and return the index in
     * bl_order of the last bit length code to send.
     */
    function build_bl_tree(s) {
      var max_blindex;  /* index of last bit length code of non zero freq */

      /* Determine the bit length frequencies for literal and distance trees */
      scan_tree(s, s.dyn_ltree, s.l_desc.max_code);
      scan_tree(s, s.dyn_dtree, s.d_desc.max_code);

      /* Build the bit length tree: */
      build_tree(s, s.bl_desc);
      /* opt_len now includes the length of the tree representations, except
       * the lengths of the bit lengths codes and the 5+5+4 bits for the counts.
       */

      /* Determine the number of bit length codes to send. The pkzip format
       * requires that at least 4 bit length codes be sent. (appnote.txt says
       * 3 but the actual value used is 4.)
       */
      for (max_blindex = BL_CODES - 1; max_blindex >= 3; max_blindex--) {
        if (s.bl_tree[bl_order[max_blindex] * 2 + 1]/*.Len*/ !== 0) {
          break;
        }
      }
      /* Update opt_len to include the bit length tree and counts */
      s.opt_len += 3 * (max_blindex + 1) + 5 + 5 + 4;
      //Tracev((stderr, "\ndyn trees: dyn %ld, stat %ld",
      //        s->opt_len, s->static_len));

      return max_blindex;
    }


    /* ===========================================================================
     * Send the header for a block using dynamic Huffman trees: the counts, the
     * lengths of the bit length codes, the literal tree and the distance tree.
     * IN assertion: lcodes >= 257, dcodes >= 1, blcodes >= 4.
     */
    function send_all_trees(s, lcodes, dcodes, blcodes)
    //    deflate_state *s;
    //    int lcodes, dcodes, blcodes; /* number of codes for each tree */
    {
      var rank;                    /* index in bl_order */

      //Assert (lcodes >= 257 && dcodes >= 1 && blcodes >= 4, "not enough codes");
      //Assert (lcodes <= L_CODES && dcodes <= D_CODES && blcodes <= BL_CODES,
      //        "too many codes");
      //Tracev((stderr, "\nbl counts: "));
      send_bits(s, lcodes - 257, 5); /* not +255 as stated in appnote.txt */
      send_bits(s, dcodes - 1,   5);
      send_bits(s, blcodes - 4,  4); /* not -3 as stated in appnote.txt */
      for (rank = 0; rank < blcodes; rank++) {
        //Tracev((stderr, "\nbl code %2d ", bl_order[rank]));
        send_bits(s, s.bl_tree[bl_order[rank] * 2 + 1]/*.Len*/, 3);
      }
      //Tracev((stderr, "\nbl tree: sent %ld", s->bits_sent));

      send_tree(s, s.dyn_ltree, lcodes - 1); /* literal tree */
      //Tracev((stderr, "\nlit tree: sent %ld", s->bits_sent));

      send_tree(s, s.dyn_dtree, dcodes - 1); /* distance tree */
      //Tracev((stderr, "\ndist tree: sent %ld", s->bits_sent));
    }


    /* ===========================================================================
     * Check if the data type is TEXT or BINARY, using the following algorithm:
     * - TEXT if the two conditions below are satisfied:
     *    a) There are no non-portable control characters belonging to the
     *       "black list" (0..6, 14..25, 28..31).
     *    b) There is at least one printable character belonging to the
     *       "white list" (9 {TAB}, 10 {LF}, 13 {CR}, 32..255).
     * - BINARY otherwise.
     * - The following partially-portable control characters form a
     *   "gray list" that is ignored in this detection algorithm:
     *   (7 {BEL}, 8 {BS}, 11 {VT}, 12 {FF}, 26 {SUB}, 27 {ESC}).
     * IN assertion: the fields Freq of dyn_ltree are set.
     */
    function detect_data_type(s) {
      /* black_mask is the bit mask of black-listed bytes
       * set bits 0..6, 14..25, and 28..31
       * 0xf3ffc07f = binary 11110011111111111100000001111111
       */
      var black_mask = 0xf3ffc07f;
      var n;

      /* Check for non-textual ("black-listed") bytes. */
      for (n = 0; n <= 31; n++, black_mask >>>= 1) {
        if ((black_mask & 1) && (s.dyn_ltree[n * 2]/*.Freq*/ !== 0)) {
          return Z_BINARY;
        }
      }

      /* Check for textual ("white-listed") bytes. */
      if (s.dyn_ltree[9 * 2]/*.Freq*/ !== 0 || s.dyn_ltree[10 * 2]/*.Freq*/ !== 0 ||
          s.dyn_ltree[13 * 2]/*.Freq*/ !== 0) {
        return Z_TEXT;
      }
      for (n = 32; n < LITERALS; n++) {
        if (s.dyn_ltree[n * 2]/*.Freq*/ !== 0) {
          return Z_TEXT;
        }
      }

      /* There are no "black-listed" or "white-listed" bytes:
       * this stream either is empty or has tolerated ("gray-listed") bytes only.
       */
      return Z_BINARY;
    }


    var static_init_done = false;

    /* ===========================================================================
     * Initialize the tree data structures for a new zlib stream.
     */
    function _tr_init(s)
    {

      if (!static_init_done) {
        tr_static_init();
        static_init_done = true;
      }

      s.l_desc  = new TreeDesc(s.dyn_ltree, static_l_desc);
      s.d_desc  = new TreeDesc(s.dyn_dtree, static_d_desc);
      s.bl_desc = new TreeDesc(s.bl_tree, static_bl_desc);

      s.bi_buf = 0;
      s.bi_valid = 0;

      /* Initialize the first block of the first file: */
      init_block(s);
    }


    /* ===========================================================================
     * Send a stored block
     */
    function _tr_stored_block(s, buf, stored_len, last)
    //DeflateState *s;
    //charf *buf;       /* input block */
    //ulg stored_len;   /* length of input block */
    //int last;         /* one if this is the last block for a file */
    {
      send_bits(s, (STORED_BLOCK << 1) + (last ? 1 : 0), 3);    /* send block type */
      copy_block(s, buf, stored_len, true); /* with header */
    }


    /* ===========================================================================
     * Send one empty static block to give enough lookahead for inflate.
     * This takes 10 bits, of which 7 may remain in the bit buffer.
     */
    function _tr_align(s) {
      send_bits(s, STATIC_TREES << 1, 3);
      send_code(s, END_BLOCK, static_ltree);
      bi_flush(s);
    }


    /* ===========================================================================
     * Determine the best encoding for the current block: dynamic trees, static
     * trees or store, and output the encoded block to the zip file.
     */
    function _tr_flush_block(s, buf, stored_len, last)
    //DeflateState *s;
    //charf *buf;       /* input block, or NULL if too old */
    //ulg stored_len;   /* length of input block */
    //int last;         /* one if this is the last block for a file */
    {
      var opt_lenb, static_lenb;  /* opt_len and static_len in bytes */
      var max_blindex = 0;        /* index of last bit length code of non zero freq */

      /* Build the Huffman trees unless a stored block is forced */
      if (s.level > 0) {

        /* Check if the file is binary or text */
        if (s.strm.data_type === Z_UNKNOWN) {
          s.strm.data_type = detect_data_type(s);
        }

        /* Construct the literal and distance trees */
        build_tree(s, s.l_desc);
        // Tracev((stderr, "\nlit data: dyn %ld, stat %ld", s->opt_len,
        //        s->static_len));

        build_tree(s, s.d_desc);
        // Tracev((stderr, "\ndist data: dyn %ld, stat %ld", s->opt_len,
        //        s->static_len));
        /* At this point, opt_len and static_len are the total bit lengths of
         * the compressed block data, excluding the tree representations.
         */

        /* Build the bit length tree for the above two trees, and get the index
         * in bl_order of the last bit length code to send.
         */
        max_blindex = build_bl_tree(s);

        /* Determine the best encoding. Compute the block lengths in bytes. */
        opt_lenb = (s.opt_len + 3 + 7) >>> 3;
        static_lenb = (s.static_len + 3 + 7) >>> 3;

        // Tracev((stderr, "\nopt %lu(%lu) stat %lu(%lu) stored %lu lit %u ",
        //        opt_lenb, s->opt_len, static_lenb, s->static_len, stored_len,
        //        s->last_lit));

        if (static_lenb <= opt_lenb) { opt_lenb = static_lenb; }

      } else {
        // Assert(buf != (char*)0, "lost buf");
        opt_lenb = static_lenb = stored_len + 5; /* force a stored block */
      }

      if ((stored_len + 4 <= opt_lenb) && (buf !== -1)) {
        /* 4: two words for the lengths */

        /* The test buf != NULL is only necessary if LIT_BUFSIZE > WSIZE.
         * Otherwise we can't have processed more than WSIZE input bytes since
         * the last block flush, because compression would have been
         * successful. If LIT_BUFSIZE <= WSIZE, it is never too late to
         * transform a block into a stored block.
         */
        _tr_stored_block(s, buf, stored_len, last);

      } else if (s.strategy === Z_FIXED || static_lenb === opt_lenb) {

        send_bits(s, (STATIC_TREES << 1) + (last ? 1 : 0), 3);
        compress_block(s, static_ltree, static_dtree);

      } else {
        send_bits(s, (DYN_TREES << 1) + (last ? 1 : 0), 3);
        send_all_trees(s, s.l_desc.max_code + 1, s.d_desc.max_code + 1, max_blindex + 1);
        compress_block(s, s.dyn_ltree, s.dyn_dtree);
      }
      // Assert (s->compressed_len == s->bits_sent, "bad compressed size");
      /* The above check is made mod 2^32, for files larger than 512 MB
       * and uLong implemented on 32 bits.
       */
      init_block(s);

      if (last) {
        bi_windup(s);
      }
      // Tracev((stderr,"\ncomprlen %lu(%lu) ", s->compressed_len>>3,
      //       s->compressed_len-7*last));
    }

    /* ===========================================================================
     * Save the match info and tally the frequency counts. Return true if
     * the current block must be flushed.
     */
    function _tr_tally(s, dist, lc)
    //    deflate_state *s;
    //    unsigned dist;  /* distance of matched string */
    //    unsigned lc;    /* match length-MIN_MATCH or unmatched char (if dist==0) */
    {
      //var out_length, in_length, dcode;

      s.pending_buf[s.d_buf + s.last_lit * 2]     = (dist >>> 8) & 0xff;
      s.pending_buf[s.d_buf + s.last_lit * 2 + 1] = dist & 0xff;

      s.pending_buf[s.l_buf + s.last_lit] = lc & 0xff;
      s.last_lit++;

      if (dist === 0) {
        /* lc is the unmatched char */
        s.dyn_ltree[lc * 2]/*.Freq*/++;
      } else {
        s.matches++;
        /* Here, lc is the match length - MIN_MATCH */
        dist--;             /* dist = match distance - 1 */
        //Assert((ush)dist < (ush)MAX_DIST(s) &&
        //       (ush)lc <= (ush)(MAX_MATCH-MIN_MATCH) &&
        //       (ush)d_code(dist) < (ush)D_CODES,  "_tr_tally: bad match");

        s.dyn_ltree[(_length_code[lc] + LITERALS + 1) * 2]/*.Freq*/++;
        s.dyn_dtree[d_code(dist) * 2]/*.Freq*/++;
      }

    // (!) This block is disabled in zlib defaults,
    // don't enable it for binary compatibility

    //#ifdef TRUNCATE_BLOCK
    //  /* Try to guess if it is profitable to stop the current block here */
    //  if ((s.last_lit & 0x1fff) === 0 && s.level > 2) {
    //    /* Compute an upper bound for the compressed length */
    //    out_length = s.last_lit*8;
    //    in_length = s.strstart - s.block_start;
    //
    //    for (dcode = 0; dcode < D_CODES; dcode++) {
    //      out_length += s.dyn_dtree[dcode*2]/*.Freq*/ * (5 + extra_dbits[dcode]);
    //    }
    //    out_length >>>= 3;
    //    //Tracev((stderr,"\nlast_lit %u, in %ld, out ~%ld(%ld%%) ",
    //    //       s->last_lit, in_length, out_length,
    //    //       100L - out_length*100L/in_length));
    //    if (s.matches < (s.last_lit>>1)/*int /2*/ && out_length < (in_length>>1)/*int /2*/) {
    //      return true;
    //    }
    //  }
    //#endif

      return (s.last_lit === s.lit_bufsize - 1);
      /* We avoid equality with lit_bufsize because of wraparound at 64K
       * on 16 bit machines and because stored blocks are restricted to
       * 64K-1 bytes.
       */
    }

    var _tr_init_1  = _tr_init;
    var _tr_stored_block_1 = _tr_stored_block;
    var _tr_flush_block_1  = _tr_flush_block;
    var _tr_tally_1 = _tr_tally;
    var _tr_align_1 = _tr_align;

    var trees = {
    	_tr_init: _tr_init_1,
    	_tr_stored_block: _tr_stored_block_1,
    	_tr_flush_block: _tr_flush_block_1,
    	_tr_tally: _tr_tally_1,
    	_tr_align: _tr_align_1
    };

    // Note: adler32 takes 12% for level 0 and 2% for level 6.
    // It isn't worth it to make additional optimizations as in original.
    // Small size is preferable.

    // (C) 1995-2013 Jean-loup Gailly and Mark Adler
    // (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
    //
    // This software is provided 'as-is', without any express or implied
    // warranty. In no event will the authors be held liable for any damages
    // arising from the use of this software.
    //
    // Permission is granted to anyone to use this software for any purpose,
    // including commercial applications, and to alter it and redistribute it
    // freely, subject to the following restrictions:
    //
    // 1. The origin of this software must not be misrepresented; you must not
    //   claim that you wrote the original software. If you use this software
    //   in a product, an acknowledgment in the product documentation would be
    //   appreciated but is not required.
    // 2. Altered source versions must be plainly marked as such, and must not be
    //   misrepresented as being the original software.
    // 3. This notice may not be removed or altered from any source distribution.

    function adler32(adler, buf, len, pos) {
      var s1 = (adler & 0xffff) |0,
          s2 = ((adler >>> 16) & 0xffff) |0,
          n = 0;

      while (len !== 0) {
        // Set limit ~ twice less than 5552, to keep
        // s2 in 31-bits, because we force signed ints.
        // in other case %= will fail.
        n = len > 2000 ? 2000 : len;
        len -= n;

        do {
          s1 = (s1 + buf[pos++]) |0;
          s2 = (s2 + s1) |0;
        } while (--n);

        s1 %= 65521;
        s2 %= 65521;
      }

      return (s1 | (s2 << 16)) |0;
    }


    var adler32_1 = adler32;

    // Note: we can't get significant speed boost here.
    // So write code to minimize size - no pregenerated tables
    // and array tools dependencies.

    // (C) 1995-2013 Jean-loup Gailly and Mark Adler
    // (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
    //
    // This software is provided 'as-is', without any express or implied
    // warranty. In no event will the authors be held liable for any damages
    // arising from the use of this software.
    //
    // Permission is granted to anyone to use this software for any purpose,
    // including commercial applications, and to alter it and redistribute it
    // freely, subject to the following restrictions:
    //
    // 1. The origin of this software must not be misrepresented; you must not
    //   claim that you wrote the original software. If you use this software
    //   in a product, an acknowledgment in the product documentation would be
    //   appreciated but is not required.
    // 2. Altered source versions must be plainly marked as such, and must not be
    //   misrepresented as being the original software.
    // 3. This notice may not be removed or altered from any source distribution.

    // Use ordinary array, since untyped makes no boost here
    function makeTable$1() {
      var c, table = [];

      for (var n = 0; n < 256; n++) {
        c = n;
        for (var k = 0; k < 8; k++) {
          c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        }
        table[n] = c;
      }

      return table;
    }

    // Create table on load. Just 255 signed longs. Not a problem.
    var crcTable$1 = makeTable$1();


    function crc32$1(crc, buf, len, pos) {
      var t = crcTable$1,
          end = pos + len;

      crc ^= -1;

      for (var i = pos; i < end; i++) {
        crc = (crc >>> 8) ^ t[(crc ^ buf[i]) & 0xFF];
      }

      return (crc ^ (-1)); // >>> 0;
    }


    var crc32_1$1 = crc32$1;

    // (C) 1995-2013 Jean-loup Gailly and Mark Adler
    // (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
    //
    // This software is provided 'as-is', without any express or implied
    // warranty. In no event will the authors be held liable for any damages
    // arising from the use of this software.
    //
    // Permission is granted to anyone to use this software for any purpose,
    // including commercial applications, and to alter it and redistribute it
    // freely, subject to the following restrictions:
    //
    // 1. The origin of this software must not be misrepresented; you must not
    //   claim that you wrote the original software. If you use this software
    //   in a product, an acknowledgment in the product documentation would be
    //   appreciated but is not required.
    // 2. Altered source versions must be plainly marked as such, and must not be
    //   misrepresented as being the original software.
    // 3. This notice may not be removed or altered from any source distribution.

    var messages = {
      2:      'need dictionary',     /* Z_NEED_DICT       2  */
      1:      'stream end',          /* Z_STREAM_END      1  */
      0:      '',                    /* Z_OK              0  */
      '-1':   'file error',          /* Z_ERRNO         (-1) */
      '-2':   'stream error',        /* Z_STREAM_ERROR  (-2) */
      '-3':   'data error',          /* Z_DATA_ERROR    (-3) */
      '-4':   'insufficient memory', /* Z_MEM_ERROR     (-4) */
      '-5':   'buffer error',        /* Z_BUF_ERROR     (-5) */
      '-6':   'incompatible version' /* Z_VERSION_ERROR (-6) */
    };

    // (C) 1995-2013 Jean-loup Gailly and Mark Adler
    // (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
    //
    // This software is provided 'as-is', without any express or implied
    // warranty. In no event will the authors be held liable for any damages
    // arising from the use of this software.
    //
    // Permission is granted to anyone to use this software for any purpose,
    // including commercial applications, and to alter it and redistribute it
    // freely, subject to the following restrictions:
    //
    // 1. The origin of this software must not be misrepresented; you must not
    //   claim that you wrote the original software. If you use this software
    //   in a product, an acknowledgment in the product documentation would be
    //   appreciated but is not required.
    // 2. Altered source versions must be plainly marked as such, and must not be
    //   misrepresented as being the original software.
    // 3. This notice may not be removed or altered from any source distribution.







    /* Public constants ==========================================================*/
    /* ===========================================================================*/


    /* Allowed flush values; see deflate() and inflate() below for details */
    var Z_NO_FLUSH      = 0;
    var Z_PARTIAL_FLUSH = 1;
    //var Z_SYNC_FLUSH    = 2;
    var Z_FULL_FLUSH    = 3;
    var Z_FINISH        = 4;
    var Z_BLOCK         = 5;
    //var Z_TREES         = 6;


    /* Return codes for the compression/decompression functions. Negative values
     * are errors, positive values are used for special but normal events.
     */
    var Z_OK            = 0;
    var Z_STREAM_END    = 1;
    //var Z_NEED_DICT     = 2;
    //var Z_ERRNO         = -1;
    var Z_STREAM_ERROR  = -2;
    var Z_DATA_ERROR    = -3;
    //var Z_MEM_ERROR     = -4;
    var Z_BUF_ERROR     = -5;
    //var Z_VERSION_ERROR = -6;


    /* compression levels */
    //var Z_NO_COMPRESSION      = 0;
    //var Z_BEST_SPEED          = 1;
    //var Z_BEST_COMPRESSION    = 9;
    var Z_DEFAULT_COMPRESSION = -1;


    var Z_FILTERED            = 1;
    var Z_HUFFMAN_ONLY        = 2;
    var Z_RLE                 = 3;
    var Z_FIXED$1               = 4;
    var Z_DEFAULT_STRATEGY    = 0;

    /* Possible values of the data_type field (though see inflate()) */
    //var Z_BINARY              = 0;
    //var Z_TEXT                = 1;
    //var Z_ASCII               = 1; // = Z_TEXT
    var Z_UNKNOWN$1             = 2;


    /* The deflate compression method */
    var Z_DEFLATED  = 8;

    /*============================================================================*/


    var MAX_MEM_LEVEL = 9;
    /* Maximum value for memLevel in deflateInit2 */
    var MAX_WBITS = 15;
    /* 32K LZ77 window */
    var DEF_MEM_LEVEL = 8;


    var LENGTH_CODES$1  = 29;
    /* number of length codes, not counting the special END_BLOCK code */
    var LITERALS$1      = 256;
    /* number of literal bytes 0..255 */
    var L_CODES$1       = LITERALS$1 + 1 + LENGTH_CODES$1;
    /* number of Literal or Length codes, including the END_BLOCK code */
    var D_CODES$1       = 30;
    /* number of distance codes */
    var BL_CODES$1      = 19;
    /* number of codes used to transfer the bit lengths */
    var HEAP_SIZE$1     = 2 * L_CODES$1 + 1;
    /* maximum heap size */
    var MAX_BITS$1  = 15;
    /* All codes must not exceed MAX_BITS bits */

    var MIN_MATCH$1 = 3;
    var MAX_MATCH$1 = 258;
    var MIN_LOOKAHEAD = (MAX_MATCH$1 + MIN_MATCH$1 + 1);

    var PRESET_DICT = 0x20;

    var INIT_STATE = 42;
    var EXTRA_STATE = 69;
    var NAME_STATE = 73;
    var COMMENT_STATE = 91;
    var HCRC_STATE = 103;
    var BUSY_STATE = 113;
    var FINISH_STATE = 666;

    var BS_NEED_MORE      = 1; /* block not completed, need more input or more output */
    var BS_BLOCK_DONE     = 2; /* block flush performed */
    var BS_FINISH_STARTED = 3; /* finish started, need only more output at next deflate */
    var BS_FINISH_DONE    = 4; /* finish done, accept no more input or output */

    var OS_CODE = 0x03; // Unix :) . Don't detect, use this default.

    function err(strm, errorCode) {
      strm.msg = messages[errorCode];
      return errorCode;
    }

    function rank(f) {
      return ((f) << 1) - ((f) > 4 ? 9 : 0);
    }

    function zero$1(buf) { var len = buf.length; while (--len >= 0) { buf[len] = 0; } }


    /* =========================================================================
     * Flush as much pending output as possible. All deflate() output goes
     * through this function so some applications may wish to modify it
     * to avoid allocating a large strm->output buffer and copying into it.
     * (See also read_buf()).
     */
    function flush_pending(strm) {
      var s = strm.state;

      //_tr_flush_bits(s);
      var len = s.pending;
      if (len > strm.avail_out) {
        len = strm.avail_out;
      }
      if (len === 0) { return; }

      common.arraySet(strm.output, s.pending_buf, s.pending_out, len, strm.next_out);
      strm.next_out += len;
      s.pending_out += len;
      strm.total_out += len;
      strm.avail_out -= len;
      s.pending -= len;
      if (s.pending === 0) {
        s.pending_out = 0;
      }
    }


    function flush_block_only(s, last) {
      trees._tr_flush_block(s, (s.block_start >= 0 ? s.block_start : -1), s.strstart - s.block_start, last);
      s.block_start = s.strstart;
      flush_pending(s.strm);
    }


    function put_byte(s, b) {
      s.pending_buf[s.pending++] = b;
    }


    /* =========================================================================
     * Put a short in the pending buffer. The 16-bit value is put in MSB order.
     * IN assertion: the stream state is correct and there is enough room in
     * pending_buf.
     */
    function putShortMSB(s, b) {
    //  put_byte(s, (Byte)(b >> 8));
    //  put_byte(s, (Byte)(b & 0xff));
      s.pending_buf[s.pending++] = (b >>> 8) & 0xff;
      s.pending_buf[s.pending++] = b & 0xff;
    }


    /* ===========================================================================
     * Read a new buffer from the current input stream, update the adler32
     * and total number of bytes read.  All deflate() input goes through
     * this function so some applications may wish to modify it to avoid
     * allocating a large strm->input buffer and copying from it.
     * (See also flush_pending()).
     */
    function read_buf(strm, buf, start, size) {
      var len = strm.avail_in;

      if (len > size) { len = size; }
      if (len === 0) { return 0; }

      strm.avail_in -= len;

      // zmemcpy(buf, strm->next_in, len);
      common.arraySet(buf, strm.input, strm.next_in, len, start);
      if (strm.state.wrap === 1) {
        strm.adler = adler32_1(strm.adler, buf, len, start);
      }

      else if (strm.state.wrap === 2) {
        strm.adler = crc32_1$1(strm.adler, buf, len, start);
      }

      strm.next_in += len;
      strm.total_in += len;

      return len;
    }


    /* ===========================================================================
     * Set match_start to the longest match starting at the given string and
     * return its length. Matches shorter or equal to prev_length are discarded,
     * in which case the result is equal to prev_length and match_start is
     * garbage.
     * IN assertions: cur_match is the head of the hash chain for the current
     *   string (strstart) and its distance is <= MAX_DIST, and prev_length >= 1
     * OUT assertion: the match length is not greater than s->lookahead.
     */
    function longest_match(s, cur_match) {
      var chain_length = s.max_chain_length;      /* max hash chain length */
      var scan = s.strstart; /* current string */
      var match;                       /* matched string */
      var len;                           /* length of current match */
      var best_len = s.prev_length;              /* best match length so far */
      var nice_match = s.nice_match;             /* stop if match long enough */
      var limit = (s.strstart > (s.w_size - MIN_LOOKAHEAD)) ?
          s.strstart - (s.w_size - MIN_LOOKAHEAD) : 0/*NIL*/;

      var _win = s.window; // shortcut

      var wmask = s.w_mask;
      var prev  = s.prev;

      /* Stop when cur_match becomes <= limit. To simplify the code,
       * we prevent matches with the string of window index 0.
       */

      var strend = s.strstart + MAX_MATCH$1;
      var scan_end1  = _win[scan + best_len - 1];
      var scan_end   = _win[scan + best_len];

      /* The code is optimized for HASH_BITS >= 8 and MAX_MATCH-2 multiple of 16.
       * It is easy to get rid of this optimization if necessary.
       */
      // Assert(s->hash_bits >= 8 && MAX_MATCH == 258, "Code too clever");

      /* Do not waste too much time if we already have a good match: */
      if (s.prev_length >= s.good_match) {
        chain_length >>= 2;
      }
      /* Do not look for matches beyond the end of the input. This is necessary
       * to make deflate deterministic.
       */
      if (nice_match > s.lookahead) { nice_match = s.lookahead; }

      // Assert((ulg)s->strstart <= s->window_size-MIN_LOOKAHEAD, "need lookahead");

      do {
        // Assert(cur_match < s->strstart, "no future");
        match = cur_match;

        /* Skip to next match if the match length cannot increase
         * or if the match length is less than 2.  Note that the checks below
         * for insufficient lookahead only occur occasionally for performance
         * reasons.  Therefore uninitialized memory will be accessed, and
         * conditional jumps will be made that depend on those values.
         * However the length of the match is limited to the lookahead, so
         * the output of deflate is not affected by the uninitialized values.
         */

        if (_win[match + best_len]     !== scan_end  ||
            _win[match + best_len - 1] !== scan_end1 ||
            _win[match]                !== _win[scan] ||
            _win[++match]              !== _win[scan + 1]) {
          continue;
        }

        /* The check at best_len-1 can be removed because it will be made
         * again later. (This heuristic is not always a win.)
         * It is not necessary to compare scan[2] and match[2] since they
         * are always equal when the other bytes match, given that
         * the hash keys are equal and that HASH_BITS >= 8.
         */
        scan += 2;
        match++;
        // Assert(*scan == *match, "match[2]?");

        /* We check for insufficient lookahead only every 8th comparison;
         * the 256th check will be made at strstart+258.
         */
        do {
          /*jshint noempty:false*/
        } while (_win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
                 _win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
                 _win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
                 _win[++scan] === _win[++match] && _win[++scan] === _win[++match] &&
                 scan < strend);

        // Assert(scan <= s->window+(unsigned)(s->window_size-1), "wild scan");

        len = MAX_MATCH$1 - (strend - scan);
        scan = strend - MAX_MATCH$1;

        if (len > best_len) {
          s.match_start = cur_match;
          best_len = len;
          if (len >= nice_match) {
            break;
          }
          scan_end1  = _win[scan + best_len - 1];
          scan_end   = _win[scan + best_len];
        }
      } while ((cur_match = prev[cur_match & wmask]) > limit && --chain_length !== 0);

      if (best_len <= s.lookahead) {
        return best_len;
      }
      return s.lookahead;
    }


    /* ===========================================================================
     * Fill the window when the lookahead becomes insufficient.
     * Updates strstart and lookahead.
     *
     * IN assertion: lookahead < MIN_LOOKAHEAD
     * OUT assertions: strstart <= window_size-MIN_LOOKAHEAD
     *    At least one byte has been read, or avail_in == 0; reads are
     *    performed for at least two bytes (required for the zip translate_eol
     *    option -- not supported here).
     */
    function fill_window(s) {
      var _w_size = s.w_size;
      var p, n, m, more, str;

      //Assert(s->lookahead < MIN_LOOKAHEAD, "already enough lookahead");

      do {
        more = s.window_size - s.lookahead - s.strstart;

        // JS ints have 32 bit, block below not needed
        /* Deal with !@#$% 64K limit: */
        //if (sizeof(int) <= 2) {
        //    if (more == 0 && s->strstart == 0 && s->lookahead == 0) {
        //        more = wsize;
        //
        //  } else if (more == (unsigned)(-1)) {
        //        /* Very unlikely, but possible on 16 bit machine if
        //         * strstart == 0 && lookahead == 1 (input done a byte at time)
        //         */
        //        more--;
        //    }
        //}


        /* If the window is almost full and there is insufficient lookahead,
         * move the upper half to the lower one to make room in the upper half.
         */
        if (s.strstart >= _w_size + (_w_size - MIN_LOOKAHEAD)) {

          common.arraySet(s.window, s.window, _w_size, _w_size, 0);
          s.match_start -= _w_size;
          s.strstart -= _w_size;
          /* we now have strstart >= MAX_DIST */
          s.block_start -= _w_size;

          /* Slide the hash table (could be avoided with 32 bit values
           at the expense of memory usage). We slide even when level == 0
           to keep the hash table consistent if we switch back to level > 0
           later. (Using level 0 permanently is not an optimal usage of
           zlib, so we don't care about this pathological case.)
           */

          n = s.hash_size;
          p = n;
          do {
            m = s.head[--p];
            s.head[p] = (m >= _w_size ? m - _w_size : 0);
          } while (--n);

          n = _w_size;
          p = n;
          do {
            m = s.prev[--p];
            s.prev[p] = (m >= _w_size ? m - _w_size : 0);
            /* If n is not on any hash chain, prev[n] is garbage but
             * its value will never be used.
             */
          } while (--n);

          more += _w_size;
        }
        if (s.strm.avail_in === 0) {
          break;
        }

        /* If there was no sliding:
         *    strstart <= WSIZE+MAX_DIST-1 && lookahead <= MIN_LOOKAHEAD - 1 &&
         *    more == window_size - lookahead - strstart
         * => more >= window_size - (MIN_LOOKAHEAD-1 + WSIZE + MAX_DIST-1)
         * => more >= window_size - 2*WSIZE + 2
         * In the BIG_MEM or MMAP case (not yet supported),
         *   window_size == input_size + MIN_LOOKAHEAD  &&
         *   strstart + s->lookahead <= input_size => more >= MIN_LOOKAHEAD.
         * Otherwise, window_size == 2*WSIZE so more >= 2.
         * If there was sliding, more >= WSIZE. So in all cases, more >= 2.
         */
        //Assert(more >= 2, "more < 2");
        n = read_buf(s.strm, s.window, s.strstart + s.lookahead, more);
        s.lookahead += n;

        /* Initialize the hash value now that we have some input: */
        if (s.lookahead + s.insert >= MIN_MATCH$1) {
          str = s.strstart - s.insert;
          s.ins_h = s.window[str];

          /* UPDATE_HASH(s, s->ins_h, s->window[str + 1]); */
          s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[str + 1]) & s.hash_mask;
    //#if MIN_MATCH != 3
    //        Call update_hash() MIN_MATCH-3 more times
    //#endif
          while (s.insert) {
            /* UPDATE_HASH(s, s->ins_h, s->window[str + MIN_MATCH-1]); */
            s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[str + MIN_MATCH$1 - 1]) & s.hash_mask;

            s.prev[str & s.w_mask] = s.head[s.ins_h];
            s.head[s.ins_h] = str;
            str++;
            s.insert--;
            if (s.lookahead + s.insert < MIN_MATCH$1) {
              break;
            }
          }
        }
        /* If the whole input has less than MIN_MATCH bytes, ins_h is garbage,
         * but this is not important since only literal bytes will be emitted.
         */

      } while (s.lookahead < MIN_LOOKAHEAD && s.strm.avail_in !== 0);

      /* If the WIN_INIT bytes after the end of the current data have never been
       * written, then zero those bytes in order to avoid memory check reports of
       * the use of uninitialized (or uninitialised as Julian writes) bytes by
       * the longest match routines.  Update the high water mark for the next
       * time through here.  WIN_INIT is set to MAX_MATCH since the longest match
       * routines allow scanning to strstart + MAX_MATCH, ignoring lookahead.
       */
    //  if (s.high_water < s.window_size) {
    //    var curr = s.strstart + s.lookahead;
    //    var init = 0;
    //
    //    if (s.high_water < curr) {
    //      /* Previous high water mark below current data -- zero WIN_INIT
    //       * bytes or up to end of window, whichever is less.
    //       */
    //      init = s.window_size - curr;
    //      if (init > WIN_INIT)
    //        init = WIN_INIT;
    //      zmemzero(s->window + curr, (unsigned)init);
    //      s->high_water = curr + init;
    //    }
    //    else if (s->high_water < (ulg)curr + WIN_INIT) {
    //      /* High water mark at or above current data, but below current data
    //       * plus WIN_INIT -- zero out to current data plus WIN_INIT, or up
    //       * to end of window, whichever is less.
    //       */
    //      init = (ulg)curr + WIN_INIT - s->high_water;
    //      if (init > s->window_size - s->high_water)
    //        init = s->window_size - s->high_water;
    //      zmemzero(s->window + s->high_water, (unsigned)init);
    //      s->high_water += init;
    //    }
    //  }
    //
    //  Assert((ulg)s->strstart <= s->window_size - MIN_LOOKAHEAD,
    //    "not enough room for search");
    }

    /* ===========================================================================
     * Copy without compression as much as possible from the input stream, return
     * the current block state.
     * This function does not insert new strings in the dictionary since
     * uncompressible data is probably not useful. This function is used
     * only for the level=0 compression option.
     * NOTE: this function should be optimized to avoid extra copying from
     * window to pending_buf.
     */
    function deflate_stored(s, flush) {
      /* Stored blocks are limited to 0xffff bytes, pending_buf is limited
       * to pending_buf_size, and each stored block has a 5 byte header:
       */
      var max_block_size = 0xffff;

      if (max_block_size > s.pending_buf_size - 5) {
        max_block_size = s.pending_buf_size - 5;
      }

      /* Copy as much as possible from input to output: */
      for (;;) {
        /* Fill the window as much as possible: */
        if (s.lookahead <= 1) {

          //Assert(s->strstart < s->w_size+MAX_DIST(s) ||
          //  s->block_start >= (long)s->w_size, "slide too late");
    //      if (!(s.strstart < s.w_size + (s.w_size - MIN_LOOKAHEAD) ||
    //        s.block_start >= s.w_size)) {
    //        throw  new Error("slide too late");
    //      }

          fill_window(s);
          if (s.lookahead === 0 && flush === Z_NO_FLUSH) {
            return BS_NEED_MORE;
          }

          if (s.lookahead === 0) {
            break;
          }
          /* flush the current block */
        }
        //Assert(s->block_start >= 0L, "block gone");
    //    if (s.block_start < 0) throw new Error("block gone");

        s.strstart += s.lookahead;
        s.lookahead = 0;

        /* Emit a stored block if pending_buf will be full: */
        var max_start = s.block_start + max_block_size;

        if (s.strstart === 0 || s.strstart >= max_start) {
          /* strstart == 0 is possible when wraparound on 16-bit machine */
          s.lookahead = s.strstart - max_start;
          s.strstart = max_start;
          /*** FLUSH_BLOCK(s, 0); ***/
          flush_block_only(s, false);
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
          /***/


        }
        /* Flush if we may have to slide, otherwise block_start may become
         * negative and the data will be gone:
         */
        if (s.strstart - s.block_start >= (s.w_size - MIN_LOOKAHEAD)) {
          /*** FLUSH_BLOCK(s, 0); ***/
          flush_block_only(s, false);
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
          /***/
        }
      }

      s.insert = 0;

      if (flush === Z_FINISH) {
        /*** FLUSH_BLOCK(s, 1); ***/
        flush_block_only(s, true);
        if (s.strm.avail_out === 0) {
          return BS_FINISH_STARTED;
        }
        /***/
        return BS_FINISH_DONE;
      }

      if (s.strstart > s.block_start) {
        /*** FLUSH_BLOCK(s, 0); ***/
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
        /***/
      }

      return BS_NEED_MORE;
    }

    /* ===========================================================================
     * Compress as much as possible from the input stream, return the current
     * block state.
     * This function does not perform lazy evaluation of matches and inserts
     * new strings in the dictionary only for unmatched strings or for short
     * matches. It is used only for the fast compression options.
     */
    function deflate_fast(s, flush) {
      var hash_head;        /* head of the hash chain */
      var bflush;           /* set if current block must be flushed */

      for (;;) {
        /* Make sure that we always have enough lookahead, except
         * at the end of the input file. We need MAX_MATCH bytes
         * for the next match, plus MIN_MATCH bytes to insert the
         * string following the next match.
         */
        if (s.lookahead < MIN_LOOKAHEAD) {
          fill_window(s);
          if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH) {
            return BS_NEED_MORE;
          }
          if (s.lookahead === 0) {
            break; /* flush the current block */
          }
        }

        /* Insert the string window[strstart .. strstart+2] in the
         * dictionary, and set hash_head to the head of the hash chain:
         */
        hash_head = 0/*NIL*/;
        if (s.lookahead >= MIN_MATCH$1) {
          /*** INSERT_STRING(s, s.strstart, hash_head); ***/
          s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + MIN_MATCH$1 - 1]) & s.hash_mask;
          hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = s.strstart;
          /***/
        }

        /* Find the longest match, discarding those <= prev_length.
         * At this point we have always match_length < MIN_MATCH
         */
        if (hash_head !== 0/*NIL*/ && ((s.strstart - hash_head) <= (s.w_size - MIN_LOOKAHEAD))) {
          /* To simplify the code, we prevent matches with the string
           * of window index 0 (in particular we have to avoid a match
           * of the string with itself at the start of the input file).
           */
          s.match_length = longest_match(s, hash_head);
          /* longest_match() sets match_start */
        }
        if (s.match_length >= MIN_MATCH$1) {
          // check_match(s, s.strstart, s.match_start, s.match_length); // for debug only

          /*** _tr_tally_dist(s, s.strstart - s.match_start,
                         s.match_length - MIN_MATCH, bflush); ***/
          bflush = trees._tr_tally(s, s.strstart - s.match_start, s.match_length - MIN_MATCH$1);

          s.lookahead -= s.match_length;

          /* Insert new strings in the hash table only if the match length
           * is not too large. This saves time but degrades compression.
           */
          if (s.match_length <= s.max_lazy_match/*max_insert_length*/ && s.lookahead >= MIN_MATCH$1) {
            s.match_length--; /* string at strstart already in table */
            do {
              s.strstart++;
              /*** INSERT_STRING(s, s.strstart, hash_head); ***/
              s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + MIN_MATCH$1 - 1]) & s.hash_mask;
              hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
              s.head[s.ins_h] = s.strstart;
              /***/
              /* strstart never exceeds WSIZE-MAX_MATCH, so there are
               * always MIN_MATCH bytes ahead.
               */
            } while (--s.match_length !== 0);
            s.strstart++;
          } else
          {
            s.strstart += s.match_length;
            s.match_length = 0;
            s.ins_h = s.window[s.strstart];
            /* UPDATE_HASH(s, s.ins_h, s.window[s.strstart+1]); */
            s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + 1]) & s.hash_mask;

    //#if MIN_MATCH != 3
    //                Call UPDATE_HASH() MIN_MATCH-3 more times
    //#endif
            /* If lookahead < MIN_MATCH, ins_h is garbage, but it does not
             * matter since it will be recomputed at next deflate call.
             */
          }
        } else {
          /* No match, output a literal byte */
          //Tracevv((stderr,"%c", s.window[s.strstart]));
          /*** _tr_tally_lit(s, s.window[s.strstart], bflush); ***/
          bflush = trees._tr_tally(s, 0, s.window[s.strstart]);

          s.lookahead--;
          s.strstart++;
        }
        if (bflush) {
          /*** FLUSH_BLOCK(s, 0); ***/
          flush_block_only(s, false);
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
          /***/
        }
      }
      s.insert = ((s.strstart < (MIN_MATCH$1 - 1)) ? s.strstart : MIN_MATCH$1 - 1);
      if (flush === Z_FINISH) {
        /*** FLUSH_BLOCK(s, 1); ***/
        flush_block_only(s, true);
        if (s.strm.avail_out === 0) {
          return BS_FINISH_STARTED;
        }
        /***/
        return BS_FINISH_DONE;
      }
      if (s.last_lit) {
        /*** FLUSH_BLOCK(s, 0); ***/
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
        /***/
      }
      return BS_BLOCK_DONE;
    }

    /* ===========================================================================
     * Same as above, but achieves better compression. We use a lazy
     * evaluation for matches: a match is finally adopted only if there is
     * no better match at the next window position.
     */
    function deflate_slow(s, flush) {
      var hash_head;          /* head of hash chain */
      var bflush;              /* set if current block must be flushed */

      var max_insert;

      /* Process the input block. */
      for (;;) {
        /* Make sure that we always have enough lookahead, except
         * at the end of the input file. We need MAX_MATCH bytes
         * for the next match, plus MIN_MATCH bytes to insert the
         * string following the next match.
         */
        if (s.lookahead < MIN_LOOKAHEAD) {
          fill_window(s);
          if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH) {
            return BS_NEED_MORE;
          }
          if (s.lookahead === 0) { break; } /* flush the current block */
        }

        /* Insert the string window[strstart .. strstart+2] in the
         * dictionary, and set hash_head to the head of the hash chain:
         */
        hash_head = 0/*NIL*/;
        if (s.lookahead >= MIN_MATCH$1) {
          /*** INSERT_STRING(s, s.strstart, hash_head); ***/
          s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + MIN_MATCH$1 - 1]) & s.hash_mask;
          hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = s.strstart;
          /***/
        }

        /* Find the longest match, discarding those <= prev_length.
         */
        s.prev_length = s.match_length;
        s.prev_match = s.match_start;
        s.match_length = MIN_MATCH$1 - 1;

        if (hash_head !== 0/*NIL*/ && s.prev_length < s.max_lazy_match &&
            s.strstart - hash_head <= (s.w_size - MIN_LOOKAHEAD)/*MAX_DIST(s)*/) {
          /* To simplify the code, we prevent matches with the string
           * of window index 0 (in particular we have to avoid a match
           * of the string with itself at the start of the input file).
           */
          s.match_length = longest_match(s, hash_head);
          /* longest_match() sets match_start */

          if (s.match_length <= 5 &&
             (s.strategy === Z_FILTERED || (s.match_length === MIN_MATCH$1 && s.strstart - s.match_start > 4096/*TOO_FAR*/))) {

            /* If prev_match is also MIN_MATCH, match_start is garbage
             * but we will ignore the current match anyway.
             */
            s.match_length = MIN_MATCH$1 - 1;
          }
        }
        /* If there was a match at the previous step and the current
         * match is not better, output the previous match:
         */
        if (s.prev_length >= MIN_MATCH$1 && s.match_length <= s.prev_length) {
          max_insert = s.strstart + s.lookahead - MIN_MATCH$1;
          /* Do not insert strings in hash table beyond this. */

          //check_match(s, s.strstart-1, s.prev_match, s.prev_length);

          /***_tr_tally_dist(s, s.strstart - 1 - s.prev_match,
                         s.prev_length - MIN_MATCH, bflush);***/
          bflush = trees._tr_tally(s, s.strstart - 1 - s.prev_match, s.prev_length - MIN_MATCH$1);
          /* Insert in hash table all strings up to the end of the match.
           * strstart-1 and strstart are already inserted. If there is not
           * enough lookahead, the last two strings are not inserted in
           * the hash table.
           */
          s.lookahead -= s.prev_length - 1;
          s.prev_length -= 2;
          do {
            if (++s.strstart <= max_insert) {
              /*** INSERT_STRING(s, s.strstart, hash_head); ***/
              s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + MIN_MATCH$1 - 1]) & s.hash_mask;
              hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
              s.head[s.ins_h] = s.strstart;
              /***/
            }
          } while (--s.prev_length !== 0);
          s.match_available = 0;
          s.match_length = MIN_MATCH$1 - 1;
          s.strstart++;

          if (bflush) {
            /*** FLUSH_BLOCK(s, 0); ***/
            flush_block_only(s, false);
            if (s.strm.avail_out === 0) {
              return BS_NEED_MORE;
            }
            /***/
          }

        } else if (s.match_available) {
          /* If there was no match at the previous position, output a
           * single literal. If there was a match but the current match
           * is longer, truncate the previous match to a single literal.
           */
          //Tracevv((stderr,"%c", s->window[s->strstart-1]));
          /*** _tr_tally_lit(s, s.window[s.strstart-1], bflush); ***/
          bflush = trees._tr_tally(s, 0, s.window[s.strstart - 1]);

          if (bflush) {
            /*** FLUSH_BLOCK_ONLY(s, 0) ***/
            flush_block_only(s, false);
            /***/
          }
          s.strstart++;
          s.lookahead--;
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
        } else {
          /* There is no previous match to compare with, wait for
           * the next step to decide.
           */
          s.match_available = 1;
          s.strstart++;
          s.lookahead--;
        }
      }
      //Assert (flush != Z_NO_FLUSH, "no flush?");
      if (s.match_available) {
        //Tracevv((stderr,"%c", s->window[s->strstart-1]));
        /*** _tr_tally_lit(s, s.window[s.strstart-1], bflush); ***/
        bflush = trees._tr_tally(s, 0, s.window[s.strstart - 1]);

        s.match_available = 0;
      }
      s.insert = s.strstart < MIN_MATCH$1 - 1 ? s.strstart : MIN_MATCH$1 - 1;
      if (flush === Z_FINISH) {
        /*** FLUSH_BLOCK(s, 1); ***/
        flush_block_only(s, true);
        if (s.strm.avail_out === 0) {
          return BS_FINISH_STARTED;
        }
        /***/
        return BS_FINISH_DONE;
      }
      if (s.last_lit) {
        /*** FLUSH_BLOCK(s, 0); ***/
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
        /***/
      }

      return BS_BLOCK_DONE;
    }


    /* ===========================================================================
     * For Z_RLE, simply look for runs of bytes, generate matches only of distance
     * one.  Do not maintain a hash table.  (It will be regenerated if this run of
     * deflate switches away from Z_RLE.)
     */
    function deflate_rle(s, flush) {
      var bflush;            /* set if current block must be flushed */
      var prev;              /* byte at distance one to match */
      var scan, strend;      /* scan goes up to strend for length of run */

      var _win = s.window;

      for (;;) {
        /* Make sure that we always have enough lookahead, except
         * at the end of the input file. We need MAX_MATCH bytes
         * for the longest run, plus one for the unrolled loop.
         */
        if (s.lookahead <= MAX_MATCH$1) {
          fill_window(s);
          if (s.lookahead <= MAX_MATCH$1 && flush === Z_NO_FLUSH) {
            return BS_NEED_MORE;
          }
          if (s.lookahead === 0) { break; } /* flush the current block */
        }

        /* See how many times the previous byte repeats */
        s.match_length = 0;
        if (s.lookahead >= MIN_MATCH$1 && s.strstart > 0) {
          scan = s.strstart - 1;
          prev = _win[scan];
          if (prev === _win[++scan] && prev === _win[++scan] && prev === _win[++scan]) {
            strend = s.strstart + MAX_MATCH$1;
            do {
              /*jshint noempty:false*/
            } while (prev === _win[++scan] && prev === _win[++scan] &&
                     prev === _win[++scan] && prev === _win[++scan] &&
                     prev === _win[++scan] && prev === _win[++scan] &&
                     prev === _win[++scan] && prev === _win[++scan] &&
                     scan < strend);
            s.match_length = MAX_MATCH$1 - (strend - scan);
            if (s.match_length > s.lookahead) {
              s.match_length = s.lookahead;
            }
          }
          //Assert(scan <= s->window+(uInt)(s->window_size-1), "wild scan");
        }

        /* Emit match if have run of MIN_MATCH or longer, else emit literal */
        if (s.match_length >= MIN_MATCH$1) {
          //check_match(s, s.strstart, s.strstart - 1, s.match_length);

          /*** _tr_tally_dist(s, 1, s.match_length - MIN_MATCH, bflush); ***/
          bflush = trees._tr_tally(s, 1, s.match_length - MIN_MATCH$1);

          s.lookahead -= s.match_length;
          s.strstart += s.match_length;
          s.match_length = 0;
        } else {
          /* No match, output a literal byte */
          //Tracevv((stderr,"%c", s->window[s->strstart]));
          /*** _tr_tally_lit(s, s.window[s.strstart], bflush); ***/
          bflush = trees._tr_tally(s, 0, s.window[s.strstart]);

          s.lookahead--;
          s.strstart++;
        }
        if (bflush) {
          /*** FLUSH_BLOCK(s, 0); ***/
          flush_block_only(s, false);
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
          /***/
        }
      }
      s.insert = 0;
      if (flush === Z_FINISH) {
        /*** FLUSH_BLOCK(s, 1); ***/
        flush_block_only(s, true);
        if (s.strm.avail_out === 0) {
          return BS_FINISH_STARTED;
        }
        /***/
        return BS_FINISH_DONE;
      }
      if (s.last_lit) {
        /*** FLUSH_BLOCK(s, 0); ***/
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
        /***/
      }
      return BS_BLOCK_DONE;
    }

    /* ===========================================================================
     * For Z_HUFFMAN_ONLY, do not look for matches.  Do not maintain a hash table.
     * (It will be regenerated if this run of deflate switches away from Huffman.)
     */
    function deflate_huff(s, flush) {
      var bflush;             /* set if current block must be flushed */

      for (;;) {
        /* Make sure that we have a literal to write. */
        if (s.lookahead === 0) {
          fill_window(s);
          if (s.lookahead === 0) {
            if (flush === Z_NO_FLUSH) {
              return BS_NEED_MORE;
            }
            break;      /* flush the current block */
          }
        }

        /* Output a literal byte */
        s.match_length = 0;
        //Tracevv((stderr,"%c", s->window[s->strstart]));
        /*** _tr_tally_lit(s, s.window[s.strstart], bflush); ***/
        bflush = trees._tr_tally(s, 0, s.window[s.strstart]);
        s.lookahead--;
        s.strstart++;
        if (bflush) {
          /*** FLUSH_BLOCK(s, 0); ***/
          flush_block_only(s, false);
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
          /***/
        }
      }
      s.insert = 0;
      if (flush === Z_FINISH) {
        /*** FLUSH_BLOCK(s, 1); ***/
        flush_block_only(s, true);
        if (s.strm.avail_out === 0) {
          return BS_FINISH_STARTED;
        }
        /***/
        return BS_FINISH_DONE;
      }
      if (s.last_lit) {
        /*** FLUSH_BLOCK(s, 0); ***/
        flush_block_only(s, false);
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
        /***/
      }
      return BS_BLOCK_DONE;
    }

    /* Values for max_lazy_match, good_match and max_chain_length, depending on
     * the desired pack level (0..9). The values given below have been tuned to
     * exclude worst case performance for pathological files. Better values may be
     * found for specific files.
     */
    function Config(good_length, max_lazy, nice_length, max_chain, func) {
      this.good_length = good_length;
      this.max_lazy = max_lazy;
      this.nice_length = nice_length;
      this.max_chain = max_chain;
      this.func = func;
    }

    var configuration_table;

    configuration_table = [
      /*      good lazy nice chain */
      new Config(0, 0, 0, 0, deflate_stored),          /* 0 store only */
      new Config(4, 4, 8, 4, deflate_fast),            /* 1 max speed, no lazy matches */
      new Config(4, 5, 16, 8, deflate_fast),           /* 2 */
      new Config(4, 6, 32, 32, deflate_fast),          /* 3 */

      new Config(4, 4, 16, 16, deflate_slow),          /* 4 lazy matches */
      new Config(8, 16, 32, 32, deflate_slow),         /* 5 */
      new Config(8, 16, 128, 128, deflate_slow),       /* 6 */
      new Config(8, 32, 128, 256, deflate_slow),       /* 7 */
      new Config(32, 128, 258, 1024, deflate_slow),    /* 8 */
      new Config(32, 258, 258, 4096, deflate_slow)     /* 9 max compression */
    ];


    /* ===========================================================================
     * Initialize the "longest match" routines for a new zlib stream
     */
    function lm_init(s) {
      s.window_size = 2 * s.w_size;

      /*** CLEAR_HASH(s); ***/
      zero$1(s.head); // Fill with NIL (= 0);

      /* Set the default configuration parameters:
       */
      s.max_lazy_match = configuration_table[s.level].max_lazy;
      s.good_match = configuration_table[s.level].good_length;
      s.nice_match = configuration_table[s.level].nice_length;
      s.max_chain_length = configuration_table[s.level].max_chain;

      s.strstart = 0;
      s.block_start = 0;
      s.lookahead = 0;
      s.insert = 0;
      s.match_length = s.prev_length = MIN_MATCH$1 - 1;
      s.match_available = 0;
      s.ins_h = 0;
    }


    function DeflateState() {
      this.strm = null;            /* pointer back to this zlib stream */
      this.status = 0;            /* as the name implies */
      this.pending_buf = null;      /* output still pending */
      this.pending_buf_size = 0;  /* size of pending_buf */
      this.pending_out = 0;       /* next pending byte to output to the stream */
      this.pending = 0;           /* nb of bytes in the pending buffer */
      this.wrap = 0;              /* bit 0 true for zlib, bit 1 true for gzip */
      this.gzhead = null;         /* gzip header information to write */
      this.gzindex = 0;           /* where in extra, name, or comment */
      this.method = Z_DEFLATED; /* can only be DEFLATED */
      this.last_flush = -1;   /* value of flush param for previous deflate call */

      this.w_size = 0;  /* LZ77 window size (32K by default) */
      this.w_bits = 0;  /* log2(w_size)  (8..16) */
      this.w_mask = 0;  /* w_size - 1 */

      this.window = null;
      /* Sliding window. Input bytes are read into the second half of the window,
       * and move to the first half later to keep a dictionary of at least wSize
       * bytes. With this organization, matches are limited to a distance of
       * wSize-MAX_MATCH bytes, but this ensures that IO is always
       * performed with a length multiple of the block size.
       */

      this.window_size = 0;
      /* Actual size of window: 2*wSize, except when the user input buffer
       * is directly used as sliding window.
       */

      this.prev = null;
      /* Link to older string with same hash index. To limit the size of this
       * array to 64K, this link is maintained only for the last 32K strings.
       * An index in this array is thus a window index modulo 32K.
       */

      this.head = null;   /* Heads of the hash chains or NIL. */

      this.ins_h = 0;       /* hash index of string to be inserted */
      this.hash_size = 0;   /* number of elements in hash table */
      this.hash_bits = 0;   /* log2(hash_size) */
      this.hash_mask = 0;   /* hash_size-1 */

      this.hash_shift = 0;
      /* Number of bits by which ins_h must be shifted at each input
       * step. It must be such that after MIN_MATCH steps, the oldest
       * byte no longer takes part in the hash key, that is:
       *   hash_shift * MIN_MATCH >= hash_bits
       */

      this.block_start = 0;
      /* Window position at the beginning of the current output block. Gets
       * negative when the window is moved backwards.
       */

      this.match_length = 0;      /* length of best match */
      this.prev_match = 0;        /* previous match */
      this.match_available = 0;   /* set if previous match exists */
      this.strstart = 0;          /* start of string to insert */
      this.match_start = 0;       /* start of matching string */
      this.lookahead = 0;         /* number of valid bytes ahead in window */

      this.prev_length = 0;
      /* Length of the best match at previous step. Matches not greater than this
       * are discarded. This is used in the lazy match evaluation.
       */

      this.max_chain_length = 0;
      /* To speed up deflation, hash chains are never searched beyond this
       * length.  A higher limit improves compression ratio but degrades the
       * speed.
       */

      this.max_lazy_match = 0;
      /* Attempt to find a better match only when the current match is strictly
       * smaller than this value. This mechanism is used only for compression
       * levels >= 4.
       */
      // That's alias to max_lazy_match, don't use directly
      //this.max_insert_length = 0;
      /* Insert new strings in the hash table only if the match length is not
       * greater than this length. This saves time but degrades compression.
       * max_insert_length is used only for compression levels <= 3.
       */

      this.level = 0;     /* compression level (1..9) */
      this.strategy = 0;  /* favor or force Huffman coding*/

      this.good_match = 0;
      /* Use a faster search when the previous match is longer than this */

      this.nice_match = 0; /* Stop searching when current match exceeds this */

                  /* used by trees.c: */

      /* Didn't use ct_data typedef below to suppress compiler warning */

      // struct ct_data_s dyn_ltree[HEAP_SIZE];   /* literal and length tree */
      // struct ct_data_s dyn_dtree[2*D_CODES+1]; /* distance tree */
      // struct ct_data_s bl_tree[2*BL_CODES+1];  /* Huffman tree for bit lengths */

      // Use flat array of DOUBLE size, with interleaved fata,
      // because JS does not support effective
      this.dyn_ltree  = new common.Buf16(HEAP_SIZE$1 * 2);
      this.dyn_dtree  = new common.Buf16((2 * D_CODES$1 + 1) * 2);
      this.bl_tree    = new common.Buf16((2 * BL_CODES$1 + 1) * 2);
      zero$1(this.dyn_ltree);
      zero$1(this.dyn_dtree);
      zero$1(this.bl_tree);

      this.l_desc   = null;         /* desc. for literal tree */
      this.d_desc   = null;         /* desc. for distance tree */
      this.bl_desc  = null;         /* desc. for bit length tree */

      //ush bl_count[MAX_BITS+1];
      this.bl_count = new common.Buf16(MAX_BITS$1 + 1);
      /* number of codes at each bit length for an optimal tree */

      //int heap[2*L_CODES+1];      /* heap used to build the Huffman trees */
      this.heap = new common.Buf16(2 * L_CODES$1 + 1);  /* heap used to build the Huffman trees */
      zero$1(this.heap);

      this.heap_len = 0;               /* number of elements in the heap */
      this.heap_max = 0;               /* element of largest frequency */
      /* The sons of heap[n] are heap[2*n] and heap[2*n+1]. heap[0] is not used.
       * The same heap array is used to build all trees.
       */

      this.depth = new common.Buf16(2 * L_CODES$1 + 1); //uch depth[2*L_CODES+1];
      zero$1(this.depth);
      /* Depth of each subtree used as tie breaker for trees of equal frequency
       */

      this.l_buf = 0;          /* buffer index for literals or lengths */

      this.lit_bufsize = 0;
      /* Size of match buffer for literals/lengths.  There are 4 reasons for
       * limiting lit_bufsize to 64K:
       *   - frequencies can be kept in 16 bit counters
       *   - if compression is not successful for the first block, all input
       *     data is still in the window so we can still emit a stored block even
       *     when input comes from standard input.  (This can also be done for
       *     all blocks if lit_bufsize is not greater than 32K.)
       *   - if compression is not successful for a file smaller than 64K, we can
       *     even emit a stored file instead of a stored block (saving 5 bytes).
       *     This is applicable only for zip (not gzip or zlib).
       *   - creating new Huffman trees less frequently may not provide fast
       *     adaptation to changes in the input data statistics. (Take for
       *     example a binary file with poorly compressible code followed by
       *     a highly compressible string table.) Smaller buffer sizes give
       *     fast adaptation but have of course the overhead of transmitting
       *     trees more frequently.
       *   - I can't count above 4
       */

      this.last_lit = 0;      /* running index in l_buf */

      this.d_buf = 0;
      /* Buffer index for distances. To simplify the code, d_buf and l_buf have
       * the same number of elements. To use different lengths, an extra flag
       * array would be necessary.
       */

      this.opt_len = 0;       /* bit length of current block with optimal trees */
      this.static_len = 0;    /* bit length of current block with static trees */
      this.matches = 0;       /* number of string matches in current block */
      this.insert = 0;        /* bytes at end of window left to insert */


      this.bi_buf = 0;
      /* Output buffer. bits are inserted starting at the bottom (least
       * significant bits).
       */
      this.bi_valid = 0;
      /* Number of valid bits in bi_buf.  All bits above the last valid bit
       * are always zero.
       */

      // Used for window memory init. We safely ignore it for JS. That makes
      // sense only for pointers and memory check tools.
      //this.high_water = 0;
      /* High water mark offset in window for initialized bytes -- bytes above
       * this are set to zero in order to avoid memory check warnings when
       * longest match routines access bytes past the input.  This is then
       * updated to the new high water mark.
       */
    }


    function deflateResetKeep(strm) {
      var s;

      if (!strm || !strm.state) {
        return err(strm, Z_STREAM_ERROR);
      }

      strm.total_in = strm.total_out = 0;
      strm.data_type = Z_UNKNOWN$1;

      s = strm.state;
      s.pending = 0;
      s.pending_out = 0;

      if (s.wrap < 0) {
        s.wrap = -s.wrap;
        /* was made negative by deflate(..., Z_FINISH); */
      }
      s.status = (s.wrap ? INIT_STATE : BUSY_STATE);
      strm.adler = (s.wrap === 2) ?
        0  // crc32(0, Z_NULL, 0)
      :
        1; // adler32(0, Z_NULL, 0)
      s.last_flush = Z_NO_FLUSH;
      trees._tr_init(s);
      return Z_OK;
    }


    function deflateReset(strm) {
      var ret = deflateResetKeep(strm);
      if (ret === Z_OK) {
        lm_init(strm.state);
      }
      return ret;
    }


    function deflateSetHeader(strm, head) {
      if (!strm || !strm.state) { return Z_STREAM_ERROR; }
      if (strm.state.wrap !== 2) { return Z_STREAM_ERROR; }
      strm.state.gzhead = head;
      return Z_OK;
    }


    function deflateInit2(strm, level, method, windowBits, memLevel, strategy) {
      if (!strm) { // === Z_NULL
        return Z_STREAM_ERROR;
      }
      var wrap = 1;

      if (level === Z_DEFAULT_COMPRESSION) {
        level = 6;
      }

      if (windowBits < 0) { /* suppress zlib wrapper */
        wrap = 0;
        windowBits = -windowBits;
      }

      else if (windowBits > 15) {
        wrap = 2;           /* write gzip wrapper instead */
        windowBits -= 16;
      }


      if (memLevel < 1 || memLevel > MAX_MEM_LEVEL || method !== Z_DEFLATED ||
        windowBits < 8 || windowBits > 15 || level < 0 || level > 9 ||
        strategy < 0 || strategy > Z_FIXED$1) {
        return err(strm, Z_STREAM_ERROR);
      }


      if (windowBits === 8) {
        windowBits = 9;
      }
      /* until 256-byte window bug fixed */

      var s = new DeflateState();

      strm.state = s;
      s.strm = strm;

      s.wrap = wrap;
      s.gzhead = null;
      s.w_bits = windowBits;
      s.w_size = 1 << s.w_bits;
      s.w_mask = s.w_size - 1;

      s.hash_bits = memLevel + 7;
      s.hash_size = 1 << s.hash_bits;
      s.hash_mask = s.hash_size - 1;
      s.hash_shift = ~~((s.hash_bits + MIN_MATCH$1 - 1) / MIN_MATCH$1);

      s.window = new common.Buf8(s.w_size * 2);
      s.head = new common.Buf16(s.hash_size);
      s.prev = new common.Buf16(s.w_size);

      // Don't need mem init magic for JS.
      //s.high_water = 0;  /* nothing written to s->window yet */

      s.lit_bufsize = 1 << (memLevel + 6); /* 16K elements by default */

      s.pending_buf_size = s.lit_bufsize * 4;

      //overlay = (ushf *) ZALLOC(strm, s->lit_bufsize, sizeof(ush)+2);
      //s->pending_buf = (uchf *) overlay;
      s.pending_buf = new common.Buf8(s.pending_buf_size);

      // It is offset from `s.pending_buf` (size is `s.lit_bufsize * 2`)
      //s->d_buf = overlay + s->lit_bufsize/sizeof(ush);
      s.d_buf = 1 * s.lit_bufsize;

      //s->l_buf = s->pending_buf + (1+sizeof(ush))*s->lit_bufsize;
      s.l_buf = (1 + 2) * s.lit_bufsize;

      s.level = level;
      s.strategy = strategy;
      s.method = method;

      return deflateReset(strm);
    }

    function deflateInit(strm, level) {
      return deflateInit2(strm, level, Z_DEFLATED, MAX_WBITS, DEF_MEM_LEVEL, Z_DEFAULT_STRATEGY);
    }


    function deflate(strm, flush) {
      var old_flush, s;
      var beg, val; // for gzip header write only

      if (!strm || !strm.state ||
        flush > Z_BLOCK || flush < 0) {
        return strm ? err(strm, Z_STREAM_ERROR) : Z_STREAM_ERROR;
      }

      s = strm.state;

      if (!strm.output ||
          (!strm.input && strm.avail_in !== 0) ||
          (s.status === FINISH_STATE && flush !== Z_FINISH)) {
        return err(strm, (strm.avail_out === 0) ? Z_BUF_ERROR : Z_STREAM_ERROR);
      }

      s.strm = strm; /* just in case */
      old_flush = s.last_flush;
      s.last_flush = flush;

      /* Write the header */
      if (s.status === INIT_STATE) {

        if (s.wrap === 2) { // GZIP header
          strm.adler = 0;  //crc32(0L, Z_NULL, 0);
          put_byte(s, 31);
          put_byte(s, 139);
          put_byte(s, 8);
          if (!s.gzhead) { // s->gzhead == Z_NULL
            put_byte(s, 0);
            put_byte(s, 0);
            put_byte(s, 0);
            put_byte(s, 0);
            put_byte(s, 0);
            put_byte(s, s.level === 9 ? 2 :
                        (s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ?
                         4 : 0));
            put_byte(s, OS_CODE);
            s.status = BUSY_STATE;
          }
          else {
            put_byte(s, (s.gzhead.text ? 1 : 0) +
                        (s.gzhead.hcrc ? 2 : 0) +
                        (!s.gzhead.extra ? 0 : 4) +
                        (!s.gzhead.name ? 0 : 8) +
                        (!s.gzhead.comment ? 0 : 16)
            );
            put_byte(s, s.gzhead.time & 0xff);
            put_byte(s, (s.gzhead.time >> 8) & 0xff);
            put_byte(s, (s.gzhead.time >> 16) & 0xff);
            put_byte(s, (s.gzhead.time >> 24) & 0xff);
            put_byte(s, s.level === 9 ? 2 :
                        (s.strategy >= Z_HUFFMAN_ONLY || s.level < 2 ?
                         4 : 0));
            put_byte(s, s.gzhead.os & 0xff);
            if (s.gzhead.extra && s.gzhead.extra.length) {
              put_byte(s, s.gzhead.extra.length & 0xff);
              put_byte(s, (s.gzhead.extra.length >> 8) & 0xff);
            }
            if (s.gzhead.hcrc) {
              strm.adler = crc32_1$1(strm.adler, s.pending_buf, s.pending, 0);
            }
            s.gzindex = 0;
            s.status = EXTRA_STATE;
          }
        }
        else // DEFLATE header
        {
          var header = (Z_DEFLATED + ((s.w_bits - 8) << 4)) << 8;
          var level_flags = -1;

          if (s.strategy >= Z_HUFFMAN_ONLY || s.level < 2) {
            level_flags = 0;
          } else if (s.level < 6) {
            level_flags = 1;
          } else if (s.level === 6) {
            level_flags = 2;
          } else {
            level_flags = 3;
          }
          header |= (level_flags << 6);
          if (s.strstart !== 0) { header |= PRESET_DICT; }
          header += 31 - (header % 31);

          s.status = BUSY_STATE;
          putShortMSB(s, header);

          /* Save the adler32 of the preset dictionary: */
          if (s.strstart !== 0) {
            putShortMSB(s, strm.adler >>> 16);
            putShortMSB(s, strm.adler & 0xffff);
          }
          strm.adler = 1; // adler32(0L, Z_NULL, 0);
        }
      }

    //#ifdef GZIP
      if (s.status === EXTRA_STATE) {
        if (s.gzhead.extra/* != Z_NULL*/) {
          beg = s.pending;  /* start of bytes to update crc */

          while (s.gzindex < (s.gzhead.extra.length & 0xffff)) {
            if (s.pending === s.pending_buf_size) {
              if (s.gzhead.hcrc && s.pending > beg) {
                strm.adler = crc32_1$1(strm.adler, s.pending_buf, s.pending - beg, beg);
              }
              flush_pending(strm);
              beg = s.pending;
              if (s.pending === s.pending_buf_size) {
                break;
              }
            }
            put_byte(s, s.gzhead.extra[s.gzindex] & 0xff);
            s.gzindex++;
          }
          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32_1$1(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          if (s.gzindex === s.gzhead.extra.length) {
            s.gzindex = 0;
            s.status = NAME_STATE;
          }
        }
        else {
          s.status = NAME_STATE;
        }
      }
      if (s.status === NAME_STATE) {
        if (s.gzhead.name/* != Z_NULL*/) {
          beg = s.pending;  /* start of bytes to update crc */
          //int val;

          do {
            if (s.pending === s.pending_buf_size) {
              if (s.gzhead.hcrc && s.pending > beg) {
                strm.adler = crc32_1$1(strm.adler, s.pending_buf, s.pending - beg, beg);
              }
              flush_pending(strm);
              beg = s.pending;
              if (s.pending === s.pending_buf_size) {
                val = 1;
                break;
              }
            }
            // JS specific: little magic to add zero terminator to end of string
            if (s.gzindex < s.gzhead.name.length) {
              val = s.gzhead.name.charCodeAt(s.gzindex++) & 0xff;
            } else {
              val = 0;
            }
            put_byte(s, val);
          } while (val !== 0);

          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32_1$1(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          if (val === 0) {
            s.gzindex = 0;
            s.status = COMMENT_STATE;
          }
        }
        else {
          s.status = COMMENT_STATE;
        }
      }
      if (s.status === COMMENT_STATE) {
        if (s.gzhead.comment/* != Z_NULL*/) {
          beg = s.pending;  /* start of bytes to update crc */
          //int val;

          do {
            if (s.pending === s.pending_buf_size) {
              if (s.gzhead.hcrc && s.pending > beg) {
                strm.adler = crc32_1$1(strm.adler, s.pending_buf, s.pending - beg, beg);
              }
              flush_pending(strm);
              beg = s.pending;
              if (s.pending === s.pending_buf_size) {
                val = 1;
                break;
              }
            }
            // JS specific: little magic to add zero terminator to end of string
            if (s.gzindex < s.gzhead.comment.length) {
              val = s.gzhead.comment.charCodeAt(s.gzindex++) & 0xff;
            } else {
              val = 0;
            }
            put_byte(s, val);
          } while (val !== 0);

          if (s.gzhead.hcrc && s.pending > beg) {
            strm.adler = crc32_1$1(strm.adler, s.pending_buf, s.pending - beg, beg);
          }
          if (val === 0) {
            s.status = HCRC_STATE;
          }
        }
        else {
          s.status = HCRC_STATE;
        }
      }
      if (s.status === HCRC_STATE) {
        if (s.gzhead.hcrc) {
          if (s.pending + 2 > s.pending_buf_size) {
            flush_pending(strm);
          }
          if (s.pending + 2 <= s.pending_buf_size) {
            put_byte(s, strm.adler & 0xff);
            put_byte(s, (strm.adler >> 8) & 0xff);
            strm.adler = 0; //crc32(0L, Z_NULL, 0);
            s.status = BUSY_STATE;
          }
        }
        else {
          s.status = BUSY_STATE;
        }
      }
    //#endif

      /* Flush as much pending output as possible */
      if (s.pending !== 0) {
        flush_pending(strm);
        if (strm.avail_out === 0) {
          /* Since avail_out is 0, deflate will be called again with
           * more output space, but possibly with both pending and
           * avail_in equal to zero. There won't be anything to do,
           * but this is not an error situation so make sure we
           * return OK instead of BUF_ERROR at next call of deflate:
           */
          s.last_flush = -1;
          return Z_OK;
        }

        /* Make sure there is something to do and avoid duplicate consecutive
         * flushes. For repeated and useless calls with Z_FINISH, we keep
         * returning Z_STREAM_END instead of Z_BUF_ERROR.
         */
      } else if (strm.avail_in === 0 && rank(flush) <= rank(old_flush) &&
        flush !== Z_FINISH) {
        return err(strm, Z_BUF_ERROR);
      }

      /* User must not provide more input after the first FINISH: */
      if (s.status === FINISH_STATE && strm.avail_in !== 0) {
        return err(strm, Z_BUF_ERROR);
      }

      /* Start a new block or continue the current one.
       */
      if (strm.avail_in !== 0 || s.lookahead !== 0 ||
        (flush !== Z_NO_FLUSH && s.status !== FINISH_STATE)) {
        var bstate = (s.strategy === Z_HUFFMAN_ONLY) ? deflate_huff(s, flush) :
          (s.strategy === Z_RLE ? deflate_rle(s, flush) :
            configuration_table[s.level].func(s, flush));

        if (bstate === BS_FINISH_STARTED || bstate === BS_FINISH_DONE) {
          s.status = FINISH_STATE;
        }
        if (bstate === BS_NEED_MORE || bstate === BS_FINISH_STARTED) {
          if (strm.avail_out === 0) {
            s.last_flush = -1;
            /* avoid BUF_ERROR next call, see above */
          }
          return Z_OK;
          /* If flush != Z_NO_FLUSH && avail_out == 0, the next call
           * of deflate should use the same flush parameter to make sure
           * that the flush is complete. So we don't have to output an
           * empty block here, this will be done at next call. This also
           * ensures that for a very small output buffer, we emit at most
           * one empty block.
           */
        }
        if (bstate === BS_BLOCK_DONE) {
          if (flush === Z_PARTIAL_FLUSH) {
            trees._tr_align(s);
          }
          else if (flush !== Z_BLOCK) { /* FULL_FLUSH or SYNC_FLUSH */

            trees._tr_stored_block(s, 0, 0, false);
            /* For a full flush, this empty block will be recognized
             * as a special marker by inflate_sync().
             */
            if (flush === Z_FULL_FLUSH) {
              /*** CLEAR_HASH(s); ***/             /* forget history */
              zero$1(s.head); // Fill with NIL (= 0);

              if (s.lookahead === 0) {
                s.strstart = 0;
                s.block_start = 0;
                s.insert = 0;
              }
            }
          }
          flush_pending(strm);
          if (strm.avail_out === 0) {
            s.last_flush = -1; /* avoid BUF_ERROR at next call, see above */
            return Z_OK;
          }
        }
      }
      //Assert(strm->avail_out > 0, "bug2");
      //if (strm.avail_out <= 0) { throw new Error("bug2");}

      if (flush !== Z_FINISH) { return Z_OK; }
      if (s.wrap <= 0) { return Z_STREAM_END; }

      /* Write the trailer */
      if (s.wrap === 2) {
        put_byte(s, strm.adler & 0xff);
        put_byte(s, (strm.adler >> 8) & 0xff);
        put_byte(s, (strm.adler >> 16) & 0xff);
        put_byte(s, (strm.adler >> 24) & 0xff);
        put_byte(s, strm.total_in & 0xff);
        put_byte(s, (strm.total_in >> 8) & 0xff);
        put_byte(s, (strm.total_in >> 16) & 0xff);
        put_byte(s, (strm.total_in >> 24) & 0xff);
      }
      else
      {
        putShortMSB(s, strm.adler >>> 16);
        putShortMSB(s, strm.adler & 0xffff);
      }

      flush_pending(strm);
      /* If avail_out is zero, the application will call deflate again
       * to flush the rest.
       */
      if (s.wrap > 0) { s.wrap = -s.wrap; }
      /* write the trailer only once! */
      return s.pending !== 0 ? Z_OK : Z_STREAM_END;
    }

    function deflateEnd(strm) {
      var status;

      if (!strm/*== Z_NULL*/ || !strm.state/*== Z_NULL*/) {
        return Z_STREAM_ERROR;
      }

      status = strm.state.status;
      if (status !== INIT_STATE &&
        status !== EXTRA_STATE &&
        status !== NAME_STATE &&
        status !== COMMENT_STATE &&
        status !== HCRC_STATE &&
        status !== BUSY_STATE &&
        status !== FINISH_STATE
      ) {
        return err(strm, Z_STREAM_ERROR);
      }

      strm.state = null;

      return status === BUSY_STATE ? err(strm, Z_DATA_ERROR) : Z_OK;
    }


    /* =========================================================================
     * Initializes the compression dictionary from the given byte
     * sequence without producing any compressed output.
     */
    function deflateSetDictionary(strm, dictionary) {
      var dictLength = dictionary.length;

      var s;
      var str, n;
      var wrap;
      var avail;
      var next;
      var input;
      var tmpDict;

      if (!strm/*== Z_NULL*/ || !strm.state/*== Z_NULL*/) {
        return Z_STREAM_ERROR;
      }

      s = strm.state;
      wrap = s.wrap;

      if (wrap === 2 || (wrap === 1 && s.status !== INIT_STATE) || s.lookahead) {
        return Z_STREAM_ERROR;
      }

      /* when using zlib wrappers, compute Adler-32 for provided dictionary */
      if (wrap === 1) {
        /* adler32(strm->adler, dictionary, dictLength); */
        strm.adler = adler32_1(strm.adler, dictionary, dictLength, 0);
      }

      s.wrap = 0;   /* avoid computing Adler-32 in read_buf */

      /* if dictionary would fill window, just replace the history */
      if (dictLength >= s.w_size) {
        if (wrap === 0) {            /* already empty otherwise */
          /*** CLEAR_HASH(s); ***/
          zero$1(s.head); // Fill with NIL (= 0);
          s.strstart = 0;
          s.block_start = 0;
          s.insert = 0;
        }
        /* use the tail */
        // dictionary = dictionary.slice(dictLength - s.w_size);
        tmpDict = new common.Buf8(s.w_size);
        common.arraySet(tmpDict, dictionary, dictLength - s.w_size, s.w_size, 0);
        dictionary = tmpDict;
        dictLength = s.w_size;
      }
      /* insert dictionary into window and hash */
      avail = strm.avail_in;
      next = strm.next_in;
      input = strm.input;
      strm.avail_in = dictLength;
      strm.next_in = 0;
      strm.input = dictionary;
      fill_window(s);
      while (s.lookahead >= MIN_MATCH$1) {
        str = s.strstart;
        n = s.lookahead - (MIN_MATCH$1 - 1);
        do {
          /* UPDATE_HASH(s, s->ins_h, s->window[str + MIN_MATCH-1]); */
          s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[str + MIN_MATCH$1 - 1]) & s.hash_mask;

          s.prev[str & s.w_mask] = s.head[s.ins_h];

          s.head[s.ins_h] = str;
          str++;
        } while (--n);
        s.strstart = str;
        s.lookahead = MIN_MATCH$1 - 1;
        fill_window(s);
      }
      s.strstart += s.lookahead;
      s.block_start = s.strstart;
      s.insert = s.lookahead;
      s.lookahead = 0;
      s.match_length = s.prev_length = MIN_MATCH$1 - 1;
      s.match_available = 0;
      strm.next_in = next;
      strm.input = input;
      strm.avail_in = avail;
      s.wrap = wrap;
      return Z_OK;
    }


    var deflateInit_1 = deflateInit;
    var deflateInit2_1 = deflateInit2;
    var deflateReset_1 = deflateReset;
    var deflateResetKeep_1 = deflateResetKeep;
    var deflateSetHeader_1 = deflateSetHeader;
    var deflate_2 = deflate;
    var deflateEnd_1 = deflateEnd;
    var deflateSetDictionary_1 = deflateSetDictionary;
    var deflateInfo = 'pako deflate (from Nodeca project)';

    /* Not implemented
    exports.deflateBound = deflateBound;
    exports.deflateCopy = deflateCopy;
    exports.deflateParams = deflateParams;
    exports.deflatePending = deflatePending;
    exports.deflatePrime = deflatePrime;
    exports.deflateTune = deflateTune;
    */

    var deflate_1 = {
    	deflateInit: deflateInit_1,
    	deflateInit2: deflateInit2_1,
    	deflateReset: deflateReset_1,
    	deflateResetKeep: deflateResetKeep_1,
    	deflateSetHeader: deflateSetHeader_1,
    	deflate: deflate_2,
    	deflateEnd: deflateEnd_1,
    	deflateSetDictionary: deflateSetDictionary_1,
    	deflateInfo: deflateInfo
    };

    // Quick check if we can use fast array to bin string conversion
    //
    // - apply(Array) can fail on Android 2.2
    // - apply(Uint8Array) can fail on iOS 5.1 Safari
    //
    var STR_APPLY_OK = true;
    var STR_APPLY_UIA_OK = true;

    try { String.fromCharCode.apply(null, [ 0 ]); } catch (__) { STR_APPLY_OK = false; }
    try { String.fromCharCode.apply(null, new Uint8Array(1)); } catch (__) { STR_APPLY_UIA_OK = false; }


    // Table with utf8 lengths (calculated by first byte of sequence)
    // Note, that 5 & 6-byte values and some 4-byte values can not be represented in JS,
    // because max possible codepoint is 0x10ffff
    var _utf8len = new common.Buf8(256);
    for (var q = 0; q < 256; q++) {
      _utf8len[q] = (q >= 252 ? 6 : q >= 248 ? 5 : q >= 240 ? 4 : q >= 224 ? 3 : q >= 192 ? 2 : 1);
    }
    _utf8len[254] = _utf8len[254] = 1; // Invalid sequence start


    // convert string to array (typed, when possible)
    var string2buf = function (str) {
      var buf, c, c2, m_pos, i, str_len = str.length, buf_len = 0;

      // count binary size
      for (m_pos = 0; m_pos < str_len; m_pos++) {
        c = str.charCodeAt(m_pos);
        if ((c & 0xfc00) === 0xd800 && (m_pos + 1 < str_len)) {
          c2 = str.charCodeAt(m_pos + 1);
          if ((c2 & 0xfc00) === 0xdc00) {
            c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
            m_pos++;
          }
        }
        buf_len += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
      }

      // allocate buffer
      buf = new common.Buf8(buf_len);

      // convert
      for (i = 0, m_pos = 0; i < buf_len; m_pos++) {
        c = str.charCodeAt(m_pos);
        if ((c & 0xfc00) === 0xd800 && (m_pos + 1 < str_len)) {
          c2 = str.charCodeAt(m_pos + 1);
          if ((c2 & 0xfc00) === 0xdc00) {
            c = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
            m_pos++;
          }
        }
        if (c < 0x80) {
          /* one byte */
          buf[i++] = c;
        } else if (c < 0x800) {
          /* two bytes */
          buf[i++] = 0xC0 | (c >>> 6);
          buf[i++] = 0x80 | (c & 0x3f);
        } else if (c < 0x10000) {
          /* three bytes */
          buf[i++] = 0xE0 | (c >>> 12);
          buf[i++] = 0x80 | (c >>> 6 & 0x3f);
          buf[i++] = 0x80 | (c & 0x3f);
        } else {
          /* four bytes */
          buf[i++] = 0xf0 | (c >>> 18);
          buf[i++] = 0x80 | (c >>> 12 & 0x3f);
          buf[i++] = 0x80 | (c >>> 6 & 0x3f);
          buf[i++] = 0x80 | (c & 0x3f);
        }
      }

      return buf;
    };

    // Helper (used in 2 places)
    function buf2binstring(buf, len) {
      // On Chrome, the arguments in a function call that are allowed is `65534`.
      // If the length of the buffer is smaller than that, we can use this optimization,
      // otherwise we will take a slower path.
      if (len < 65534) {
        if ((buf.subarray && STR_APPLY_UIA_OK) || (!buf.subarray && STR_APPLY_OK)) {
          return String.fromCharCode.apply(null, common.shrinkBuf(buf, len));
        }
      }

      var result = '';
      for (var i = 0; i < len; i++) {
        result += String.fromCharCode(buf[i]);
      }
      return result;
    }


    // Convert byte array to binary string
    var buf2binstring_1 = function (buf) {
      return buf2binstring(buf, buf.length);
    };


    // Convert binary string (typed, when possible)
    var binstring2buf = function (str) {
      var buf = new common.Buf8(str.length);
      for (var i = 0, len = buf.length; i < len; i++) {
        buf[i] = str.charCodeAt(i);
      }
      return buf;
    };


    // convert array to string
    var buf2string = function (buf, max) {
      var i, out, c, c_len;
      var len = max || buf.length;

      // Reserve max possible length (2 words per char)
      // NB: by unknown reasons, Array is significantly faster for
      //     String.fromCharCode.apply than Uint16Array.
      var utf16buf = new Array(len * 2);

      for (out = 0, i = 0; i < len;) {
        c = buf[i++];
        // quick process ascii
        if (c < 0x80) { utf16buf[out++] = c; continue; }

        c_len = _utf8len[c];
        // skip 5 & 6 byte codes
        if (c_len > 4) { utf16buf[out++] = 0xfffd; i += c_len - 1; continue; }

        // apply mask on first byte
        c &= c_len === 2 ? 0x1f : c_len === 3 ? 0x0f : 0x07;
        // join the rest
        while (c_len > 1 && i < len) {
          c = (c << 6) | (buf[i++] & 0x3f);
          c_len--;
        }

        // terminated by end of string?
        if (c_len > 1) { utf16buf[out++] = 0xfffd; continue; }

        if (c < 0x10000) {
          utf16buf[out++] = c;
        } else {
          c -= 0x10000;
          utf16buf[out++] = 0xd800 | ((c >> 10) & 0x3ff);
          utf16buf[out++] = 0xdc00 | (c & 0x3ff);
        }
      }

      return buf2binstring(utf16buf, out);
    };


    // Calculate max possible position in utf8 buffer,
    // that will not break sequence. If that's not possible
    // - (very small limits) return max size as is.
    //
    // buf[] - utf8 bytes array
    // max   - length limit (mandatory);
    var utf8border = function (buf, max) {
      var pos;

      max = max || buf.length;
      if (max > buf.length) { max = buf.length; }

      // go back from last position, until start of sequence found
      pos = max - 1;
      while (pos >= 0 && (buf[pos] & 0xC0) === 0x80) { pos--; }

      // Very small and broken sequence,
      // return max, because we should return something anyway.
      if (pos < 0) { return max; }

      // If we came to start of buffer - that means buffer is too small,
      // return max too.
      if (pos === 0) { return max; }

      return (pos + _utf8len[buf[pos]] > max) ? pos : max;
    };

    var strings = {
    	string2buf: string2buf,
    	buf2binstring: buf2binstring_1,
    	binstring2buf: binstring2buf,
    	buf2string: buf2string,
    	utf8border: utf8border
    };

    // (C) 1995-2013 Jean-loup Gailly and Mark Adler
    // (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
    //
    // This software is provided 'as-is', without any express or implied
    // warranty. In no event will the authors be held liable for any damages
    // arising from the use of this software.
    //
    // Permission is granted to anyone to use this software for any purpose,
    // including commercial applications, and to alter it and redistribute it
    // freely, subject to the following restrictions:
    //
    // 1. The origin of this software must not be misrepresented; you must not
    //   claim that you wrote the original software. If you use this software
    //   in a product, an acknowledgment in the product documentation would be
    //   appreciated but is not required.
    // 2. Altered source versions must be plainly marked as such, and must not be
    //   misrepresented as being the original software.
    // 3. This notice may not be removed or altered from any source distribution.

    function ZStream() {
      /* next input byte */
      this.input = null; // JS specific, because we have no pointers
      this.next_in = 0;
      /* number of bytes available at input */
      this.avail_in = 0;
      /* total number of input bytes read so far */
      this.total_in = 0;
      /* next output byte should be put there */
      this.output = null; // JS specific, because we have no pointers
      this.next_out = 0;
      /* remaining free space at output */
      this.avail_out = 0;
      /* total number of bytes output so far */
      this.total_out = 0;
      /* last error message, NULL if no error */
      this.msg = ''/*Z_NULL*/;
      /* not visible by applications */
      this.state = null;
      /* best guess about the data type: binary or text */
      this.data_type = 2/*Z_UNKNOWN*/;
      /* adler32 value of the uncompressed data */
      this.adler = 0;
    }

    var zstream = ZStream;

    var toString$1 = Object.prototype.toString;

    /* Public constants ==========================================================*/
    /* ===========================================================================*/

    var Z_NO_FLUSH$1      = 0;
    var Z_FINISH$1        = 4;

    var Z_OK$1            = 0;
    var Z_STREAM_END$1    = 1;
    var Z_SYNC_FLUSH    = 2;

    var Z_DEFAULT_COMPRESSION$1 = -1;

    var Z_DEFAULT_STRATEGY$1    = 0;

    var Z_DEFLATED$1  = 8;

    /* ===========================================================================*/


    /**
     * class Deflate
     *
     * Generic JS-style wrapper for zlib calls. If you don't need
     * streaming behaviour - use more simple functions: [[deflate]],
     * [[deflateRaw]] and [[gzip]].
     **/

    /* internal
     * Deflate.chunks -> Array
     *
     * Chunks of output data, if [[Deflate#onData]] not overridden.
     **/

    /**
     * Deflate.result -> Uint8Array|Array
     *
     * Compressed result, generated by default [[Deflate#onData]]
     * and [[Deflate#onEnd]] handlers. Filled after you push last chunk
     * (call [[Deflate#push]] with `Z_FINISH` / `true` param)  or if you
     * push a chunk with explicit flush (call [[Deflate#push]] with
     * `Z_SYNC_FLUSH` param).
     **/

    /**
     * Deflate.err -> Number
     *
     * Error code after deflate finished. 0 (Z_OK) on success.
     * You will not need it in real life, because deflate errors
     * are possible only on wrong options or bad `onData` / `onEnd`
     * custom handlers.
     **/

    /**
     * Deflate.msg -> String
     *
     * Error message, if [[Deflate.err]] != 0
     **/


    /**
     * new Deflate(options)
     * - options (Object): zlib deflate options.
     *
     * Creates new deflator instance with specified params. Throws exception
     * on bad params. Supported options:
     *
     * - `level`
     * - `windowBits`
     * - `memLevel`
     * - `strategy`
     * - `dictionary`
     *
     * [http://zlib.net/manual.html#Advanced](http://zlib.net/manual.html#Advanced)
     * for more information on these.
     *
     * Additional options, for internal needs:
     *
     * - `chunkSize` - size of generated data chunks (16K by default)
     * - `raw` (Boolean) - do raw deflate
     * - `gzip` (Boolean) - create gzip wrapper
     * - `to` (String) - if equal to 'string', then result will be "binary string"
     *    (each char code [0..255])
     * - `header` (Object) - custom header for gzip
     *   - `text` (Boolean) - true if compressed data believed to be text
     *   - `time` (Number) - modification time, unix timestamp
     *   - `os` (Number) - operation system code
     *   - `extra` (Array) - array of bytes with extra data (max 65536)
     *   - `name` (String) - file name (binary string)
     *   - `comment` (String) - comment (binary string)
     *   - `hcrc` (Boolean) - true if header crc should be added
     *
     * ##### Example:
     *
     * ```javascript
     * var pako = require('pako')
     *   , chunk1 = Uint8Array([1,2,3,4,5,6,7,8,9])
     *   , chunk2 = Uint8Array([10,11,12,13,14,15,16,17,18,19]);
     *
     * var deflate = new pako.Deflate({ level: 3});
     *
     * deflate.push(chunk1, false);
     * deflate.push(chunk2, true);  // true -> last chunk
     *
     * if (deflate.err) { throw new Error(deflate.err); }
     *
     * console.log(deflate.result);
     * ```
     **/
    function Deflate(options) {
      if (!(this instanceof Deflate)) return new Deflate(options);

      this.options = common.assign({
        level: Z_DEFAULT_COMPRESSION$1,
        method: Z_DEFLATED$1,
        chunkSize: 16384,
        windowBits: 15,
        memLevel: 8,
        strategy: Z_DEFAULT_STRATEGY$1,
        to: ''
      }, options || {});

      var opt = this.options;

      if (opt.raw && (opt.windowBits > 0)) {
        opt.windowBits = -opt.windowBits;
      }

      else if (opt.gzip && (opt.windowBits > 0) && (opt.windowBits < 16)) {
        opt.windowBits += 16;
      }

      this.err    = 0;      // error code, if happens (0 = Z_OK)
      this.msg    = '';     // error message
      this.ended  = false;  // used to avoid multiple onEnd() calls
      this.chunks = [];     // chunks of compressed data

      this.strm = new zstream();
      this.strm.avail_out = 0;

      var status = deflate_1.deflateInit2(
        this.strm,
        opt.level,
        opt.method,
        opt.windowBits,
        opt.memLevel,
        opt.strategy
      );

      if (status !== Z_OK$1) {
        throw new Error(messages[status]);
      }

      if (opt.header) {
        deflate_1.deflateSetHeader(this.strm, opt.header);
      }

      if (opt.dictionary) {
        var dict;
        // Convert data if needed
        if (typeof opt.dictionary === 'string') {
          // If we need to compress text, change encoding to utf8.
          dict = strings.string2buf(opt.dictionary);
        } else if (toString$1.call(opt.dictionary) === '[object ArrayBuffer]') {
          dict = new Uint8Array(opt.dictionary);
        } else {
          dict = opt.dictionary;
        }

        status = deflate_1.deflateSetDictionary(this.strm, dict);

        if (status !== Z_OK$1) {
          throw new Error(messages[status]);
        }

        this._dict_set = true;
      }
    }

    /**
     * Deflate#push(data[, mode]) -> Boolean
     * - data (Uint8Array|Array|ArrayBuffer|String): input data. Strings will be
     *   converted to utf8 byte sequence.
     * - mode (Number|Boolean): 0..6 for corresponding Z_NO_FLUSH..Z_TREE modes.
     *   See constants. Skipped or `false` means Z_NO_FLUSH, `true` means Z_FINISH.
     *
     * Sends input data to deflate pipe, generating [[Deflate#onData]] calls with
     * new compressed chunks. Returns `true` on success. The last data block must have
     * mode Z_FINISH (or `true`). That will flush internal pending buffers and call
     * [[Deflate#onEnd]]. For interim explicit flushes (without ending the stream) you
     * can use mode Z_SYNC_FLUSH, keeping the compression context.
     *
     * On fail call [[Deflate#onEnd]] with error code and return false.
     *
     * We strongly recommend to use `Uint8Array` on input for best speed (output
     * array format is detected automatically). Also, don't skip last param and always
     * use the same type in your code (boolean or number). That will improve JS speed.
     *
     * For regular `Array`-s make sure all elements are [0..255].
     *
     * ##### Example
     *
     * ```javascript
     * push(chunk, false); // push one of data chunks
     * ...
     * push(chunk, true);  // push last chunk
     * ```
     **/
    Deflate.prototype.push = function (data, mode) {
      var strm = this.strm;
      var chunkSize = this.options.chunkSize;
      var status, _mode;

      if (this.ended) { return false; }

      _mode = (mode === ~~mode) ? mode : ((mode === true) ? Z_FINISH$1 : Z_NO_FLUSH$1);

      // Convert data if needed
      if (typeof data === 'string') {
        // If we need to compress text, change encoding to utf8.
        strm.input = strings.string2buf(data);
      } else if (toString$1.call(data) === '[object ArrayBuffer]') {
        strm.input = new Uint8Array(data);
      } else {
        strm.input = data;
      }

      strm.next_in = 0;
      strm.avail_in = strm.input.length;

      do {
        if (strm.avail_out === 0) {
          strm.output = new common.Buf8(chunkSize);
          strm.next_out = 0;
          strm.avail_out = chunkSize;
        }
        status = deflate_1.deflate(strm, _mode);    /* no bad return value */

        if (status !== Z_STREAM_END$1 && status !== Z_OK$1) {
          this.onEnd(status);
          this.ended = true;
          return false;
        }
        if (strm.avail_out === 0 || (strm.avail_in === 0 && (_mode === Z_FINISH$1 || _mode === Z_SYNC_FLUSH))) {
          if (this.options.to === 'string') {
            this.onData(strings.buf2binstring(common.shrinkBuf(strm.output, strm.next_out)));
          } else {
            this.onData(common.shrinkBuf(strm.output, strm.next_out));
          }
        }
      } while ((strm.avail_in > 0 || strm.avail_out === 0) && status !== Z_STREAM_END$1);

      // Finalize on the last chunk.
      if (_mode === Z_FINISH$1) {
        status = deflate_1.deflateEnd(this.strm);
        this.onEnd(status);
        this.ended = true;
        return status === Z_OK$1;
      }

      // callback interim results if Z_SYNC_FLUSH.
      if (_mode === Z_SYNC_FLUSH) {
        this.onEnd(Z_OK$1);
        strm.avail_out = 0;
        return true;
      }

      return true;
    };


    /**
     * Deflate#onData(chunk) -> Void
     * - chunk (Uint8Array|Array|String): output data. Type of array depends
     *   on js engine support. When string output requested, each chunk
     *   will be string.
     *
     * By default, stores data blocks in `chunks[]` property and glue
     * those in `onEnd`. Override this handler, if you need another behaviour.
     **/
    Deflate.prototype.onData = function (chunk) {
      this.chunks.push(chunk);
    };


    /**
     * Deflate#onEnd(status) -> Void
     * - status (Number): deflate status. 0 (Z_OK) on success,
     *   other if not.
     *
     * Called once after you tell deflate that the input stream is
     * complete (Z_FINISH) or should be flushed (Z_SYNC_FLUSH)
     * or if an error happened. By default - join collected chunks,
     * free memory and fill `results` / `err` properties.
     **/
    Deflate.prototype.onEnd = function (status) {
      // On success - join
      if (status === Z_OK$1) {
        if (this.options.to === 'string') {
          this.result = this.chunks.join('');
        } else {
          this.result = common.flattenChunks(this.chunks);
        }
      }
      this.chunks = [];
      this.err = status;
      this.msg = this.strm.msg;
    };


    /**
     * deflate(data[, options]) -> Uint8Array|Array|String
     * - data (Uint8Array|Array|String): input data to compress.
     * - options (Object): zlib deflate options.
     *
     * Compress `data` with deflate algorithm and `options`.
     *
     * Supported options are:
     *
     * - level
     * - windowBits
     * - memLevel
     * - strategy
     * - dictionary
     *
     * [http://zlib.net/manual.html#Advanced](http://zlib.net/manual.html#Advanced)
     * for more information on these.
     *
     * Sugar (options):
     *
     * - `raw` (Boolean) - say that we work with raw stream, if you don't wish to specify
     *   negative windowBits implicitly.
     * - `to` (String) - if equal to 'string', then result will be "binary string"
     *    (each char code [0..255])
     *
     * ##### Example:
     *
     * ```javascript
     * var pako = require('pako')
     *   , data = Uint8Array([1,2,3,4,5,6,7,8,9]);
     *
     * console.log(pako.deflate(data));
     * ```
     **/
    function deflate$1(input, options) {
      var deflator = new Deflate(options);

      deflator.push(input, true);

      // That will never happens, if you don't cheat with options :)
      if (deflator.err) { throw deflator.msg || messages[deflator.err]; }

      return deflator.result;
    }


    /**
     * deflateRaw(data[, options]) -> Uint8Array|Array|String
     * - data (Uint8Array|Array|String): input data to compress.
     * - options (Object): zlib deflate options.
     *
     * The same as [[deflate]], but creates raw data, without wrapper
     * (header and adler32 crc).
     **/
    function deflateRaw(input, options) {
      options = options || {};
      options.raw = true;
      return deflate$1(input, options);
    }


    /**
     * gzip(data[, options]) -> Uint8Array|Array|String
     * - data (Uint8Array|Array|String): input data to compress.
     * - options (Object): zlib deflate options.
     *
     * The same as [[deflate]], but create gzip wrapper instead of
     * deflate one.
     **/
    function gzip(input, options) {
      options = options || {};
      options.gzip = true;
      return deflate$1(input, options);
    }


    var Deflate_1 = Deflate;
    var deflate_2$1 = deflate$1;
    var deflateRaw_1 = deflateRaw;
    var gzip_1 = gzip;

    var deflate_1$1 = {
    	Deflate: Deflate_1,
    	deflate: deflate_2$1,
    	deflateRaw: deflateRaw_1,
    	gzip: gzip_1
    };

    // (C) 1995-2013 Jean-loup Gailly and Mark Adler
    // (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
    //
    // This software is provided 'as-is', without any express or implied
    // warranty. In no event will the authors be held liable for any damages
    // arising from the use of this software.
    //
    // Permission is granted to anyone to use this software for any purpose,
    // including commercial applications, and to alter it and redistribute it
    // freely, subject to the following restrictions:
    //
    // 1. The origin of this software must not be misrepresented; you must not
    //   claim that you wrote the original software. If you use this software
    //   in a product, an acknowledgment in the product documentation would be
    //   appreciated but is not required.
    // 2. Altered source versions must be plainly marked as such, and must not be
    //   misrepresented as being the original software.
    // 3. This notice may not be removed or altered from any source distribution.

    // See state defs from inflate.js
    var BAD = 30;       /* got a data error -- remain here until reset */
    var TYPE = 12;      /* i: waiting for type bits, including last-flag bit */

    /*
       Decode literal, length, and distance codes and write out the resulting
       literal and match bytes until either not enough input or output is
       available, an end-of-block is encountered, or a data error is encountered.
       When large enough input and output buffers are supplied to inflate(), for
       example, a 16K input buffer and a 64K output buffer, more than 95% of the
       inflate execution time is spent in this routine.

       Entry assumptions:

            state.mode === LEN
            strm.avail_in >= 6
            strm.avail_out >= 258
            start >= strm.avail_out
            state.bits < 8

       On return, state.mode is one of:

            LEN -- ran out of enough output space or enough available input
            TYPE -- reached end of block code, inflate() to interpret next block
            BAD -- error in block data

       Notes:

        - The maximum input bits used by a length/distance pair is 15 bits for the
          length code, 5 bits for the length extra, 15 bits for the distance code,
          and 13 bits for the distance extra.  This totals 48 bits, or six bytes.
          Therefore if strm.avail_in >= 6, then there is enough input to avoid
          checking for available input while decoding.

        - The maximum bytes that a single length/distance pair can output is 258
          bytes, which is the maximum length that can be coded.  inflate_fast()
          requires strm.avail_out >= 258 for each loop to avoid checking for
          output space.
     */
    var inffast = function inflate_fast(strm, start) {
      var state;
      var _in;                    /* local strm.input */
      var last;                   /* have enough input while in < last */
      var _out;                   /* local strm.output */
      var beg;                    /* inflate()'s initial strm.output */
      var end;                    /* while out < end, enough space available */
    //#ifdef INFLATE_STRICT
      var dmax;                   /* maximum distance from zlib header */
    //#endif
      var wsize;                  /* window size or zero if not using window */
      var whave;                  /* valid bytes in the window */
      var wnext;                  /* window write index */
      // Use `s_window` instead `window`, avoid conflict with instrumentation tools
      var s_window;               /* allocated sliding window, if wsize != 0 */
      var hold;                   /* local strm.hold */
      var bits;                   /* local strm.bits */
      var lcode;                  /* local strm.lencode */
      var dcode;                  /* local strm.distcode */
      var lmask;                  /* mask for first level of length codes */
      var dmask;                  /* mask for first level of distance codes */
      var here;                   /* retrieved table entry */
      var op;                     /* code bits, operation, extra bits, or */
                                  /*  window position, window bytes to copy */
      var len;                    /* match length, unused bytes */
      var dist;                   /* match distance */
      var from;                   /* where to copy match from */
      var from_source;


      var input, output; // JS specific, because we have no pointers

      /* copy state to local variables */
      state = strm.state;
      //here = state.here;
      _in = strm.next_in;
      input = strm.input;
      last = _in + (strm.avail_in - 5);
      _out = strm.next_out;
      output = strm.output;
      beg = _out - (start - strm.avail_out);
      end = _out + (strm.avail_out - 257);
    //#ifdef INFLATE_STRICT
      dmax = state.dmax;
    //#endif
      wsize = state.wsize;
      whave = state.whave;
      wnext = state.wnext;
      s_window = state.window;
      hold = state.hold;
      bits = state.bits;
      lcode = state.lencode;
      dcode = state.distcode;
      lmask = (1 << state.lenbits) - 1;
      dmask = (1 << state.distbits) - 1;


      /* decode literals and length/distances until end-of-block or not enough
         input data or output space */

      top:
      do {
        if (bits < 15) {
          hold += input[_in++] << bits;
          bits += 8;
          hold += input[_in++] << bits;
          bits += 8;
        }

        here = lcode[hold & lmask];

        dolen:
        for (;;) { // Goto emulation
          op = here >>> 24/*here.bits*/;
          hold >>>= op;
          bits -= op;
          op = (here >>> 16) & 0xff/*here.op*/;
          if (op === 0) {                          /* literal */
            //Tracevv((stderr, here.val >= 0x20 && here.val < 0x7f ?
            //        "inflate:         literal '%c'\n" :
            //        "inflate:         literal 0x%02x\n", here.val));
            output[_out++] = here & 0xffff/*here.val*/;
          }
          else if (op & 16) {                     /* length base */
            len = here & 0xffff/*here.val*/;
            op &= 15;                           /* number of extra bits */
            if (op) {
              if (bits < op) {
                hold += input[_in++] << bits;
                bits += 8;
              }
              len += hold & ((1 << op) - 1);
              hold >>>= op;
              bits -= op;
            }
            //Tracevv((stderr, "inflate:         length %u\n", len));
            if (bits < 15) {
              hold += input[_in++] << bits;
              bits += 8;
              hold += input[_in++] << bits;
              bits += 8;
            }
            here = dcode[hold & dmask];

            dodist:
            for (;;) { // goto emulation
              op = here >>> 24/*here.bits*/;
              hold >>>= op;
              bits -= op;
              op = (here >>> 16) & 0xff/*here.op*/;

              if (op & 16) {                      /* distance base */
                dist = here & 0xffff/*here.val*/;
                op &= 15;                       /* number of extra bits */
                if (bits < op) {
                  hold += input[_in++] << bits;
                  bits += 8;
                  if (bits < op) {
                    hold += input[_in++] << bits;
                    bits += 8;
                  }
                }
                dist += hold & ((1 << op) - 1);
    //#ifdef INFLATE_STRICT
                if (dist > dmax) {
                  strm.msg = 'invalid distance too far back';
                  state.mode = BAD;
                  break top;
                }
    //#endif
                hold >>>= op;
                bits -= op;
                //Tracevv((stderr, "inflate:         distance %u\n", dist));
                op = _out - beg;                /* max distance in output */
                if (dist > op) {                /* see if copy from window */
                  op = dist - op;               /* distance back in window */
                  if (op > whave) {
                    if (state.sane) {
                      strm.msg = 'invalid distance too far back';
                      state.mode = BAD;
                      break top;
                    }

    // (!) This block is disabled in zlib defaults,
    // don't enable it for binary compatibility
    //#ifdef INFLATE_ALLOW_INVALID_DISTANCE_TOOFAR_ARRR
    //                if (len <= op - whave) {
    //                  do {
    //                    output[_out++] = 0;
    //                  } while (--len);
    //                  continue top;
    //                }
    //                len -= op - whave;
    //                do {
    //                  output[_out++] = 0;
    //                } while (--op > whave);
    //                if (op === 0) {
    //                  from = _out - dist;
    //                  do {
    //                    output[_out++] = output[from++];
    //                  } while (--len);
    //                  continue top;
    //                }
    //#endif
                  }
                  from = 0; // window index
                  from_source = s_window;
                  if (wnext === 0) {           /* very common case */
                    from += wsize - op;
                    if (op < len) {         /* some from window */
                      len -= op;
                      do {
                        output[_out++] = s_window[from++];
                      } while (--op);
                      from = _out - dist;  /* rest from output */
                      from_source = output;
                    }
                  }
                  else if (wnext < op) {      /* wrap around window */
                    from += wsize + wnext - op;
                    op -= wnext;
                    if (op < len) {         /* some from end of window */
                      len -= op;
                      do {
                        output[_out++] = s_window[from++];
                      } while (--op);
                      from = 0;
                      if (wnext < len) {  /* some from start of window */
                        op = wnext;
                        len -= op;
                        do {
                          output[_out++] = s_window[from++];
                        } while (--op);
                        from = _out - dist;      /* rest from output */
                        from_source = output;
                      }
                    }
                  }
                  else {                      /* contiguous in window */
                    from += wnext - op;
                    if (op < len) {         /* some from window */
                      len -= op;
                      do {
                        output[_out++] = s_window[from++];
                      } while (--op);
                      from = _out - dist;  /* rest from output */
                      from_source = output;
                    }
                  }
                  while (len > 2) {
                    output[_out++] = from_source[from++];
                    output[_out++] = from_source[from++];
                    output[_out++] = from_source[from++];
                    len -= 3;
                  }
                  if (len) {
                    output[_out++] = from_source[from++];
                    if (len > 1) {
                      output[_out++] = from_source[from++];
                    }
                  }
                }
                else {
                  from = _out - dist;          /* copy direct from output */
                  do {                        /* minimum length is three */
                    output[_out++] = output[from++];
                    output[_out++] = output[from++];
                    output[_out++] = output[from++];
                    len -= 3;
                  } while (len > 2);
                  if (len) {
                    output[_out++] = output[from++];
                    if (len > 1) {
                      output[_out++] = output[from++];
                    }
                  }
                }
              }
              else if ((op & 64) === 0) {          /* 2nd level distance code */
                here = dcode[(here & 0xffff)/*here.val*/ + (hold & ((1 << op) - 1))];
                continue dodist;
              }
              else {
                strm.msg = 'invalid distance code';
                state.mode = BAD;
                break top;
              }

              break; // need to emulate goto via "continue"
            }
          }
          else if ((op & 64) === 0) {              /* 2nd level length code */
            here = lcode[(here & 0xffff)/*here.val*/ + (hold & ((1 << op) - 1))];
            continue dolen;
          }
          else if (op & 32) {                     /* end-of-block */
            //Tracevv((stderr, "inflate:         end of block\n"));
            state.mode = TYPE;
            break top;
          }
          else {
            strm.msg = 'invalid literal/length code';
            state.mode = BAD;
            break top;
          }

          break; // need to emulate goto via "continue"
        }
      } while (_in < last && _out < end);

      /* return unused bytes (on entry, bits < 8, so in won't go too far back) */
      len = bits >> 3;
      _in -= len;
      bits -= len << 3;
      hold &= (1 << bits) - 1;

      /* update state and return */
      strm.next_in = _in;
      strm.next_out = _out;
      strm.avail_in = (_in < last ? 5 + (last - _in) : 5 - (_in - last));
      strm.avail_out = (_out < end ? 257 + (end - _out) : 257 - (_out - end));
      state.hold = hold;
      state.bits = bits;
      return;
    };

    // (C) 1995-2013 Jean-loup Gailly and Mark Adler
    // (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
    //
    // This software is provided 'as-is', without any express or implied
    // warranty. In no event will the authors be held liable for any damages
    // arising from the use of this software.
    //
    // Permission is granted to anyone to use this software for any purpose,
    // including commercial applications, and to alter it and redistribute it
    // freely, subject to the following restrictions:
    //
    // 1. The origin of this software must not be misrepresented; you must not
    //   claim that you wrote the original software. If you use this software
    //   in a product, an acknowledgment in the product documentation would be
    //   appreciated but is not required.
    // 2. Altered source versions must be plainly marked as such, and must not be
    //   misrepresented as being the original software.
    // 3. This notice may not be removed or altered from any source distribution.



    var MAXBITS = 15;
    var ENOUGH_LENS = 852;
    var ENOUGH_DISTS = 592;
    //var ENOUGH = (ENOUGH_LENS+ENOUGH_DISTS);

    var CODES = 0;
    var LENS = 1;
    var DISTS = 2;

    var lbase = [ /* Length codes 257..285 base */
      3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31,
      35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258, 0, 0
    ];

    var lext = [ /* Length codes 257..285 extra */
      16, 16, 16, 16, 16, 16, 16, 16, 17, 17, 17, 17, 18, 18, 18, 18,
      19, 19, 19, 19, 20, 20, 20, 20, 21, 21, 21, 21, 16, 72, 78
    ];

    var dbase = [ /* Distance codes 0..29 base */
      1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193,
      257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145,
      8193, 12289, 16385, 24577, 0, 0
    ];

    var dext = [ /* Distance codes 0..29 extra */
      16, 16, 16, 16, 17, 17, 18, 18, 19, 19, 20, 20, 21, 21, 22, 22,
      23, 23, 24, 24, 25, 25, 26, 26, 27, 27,
      28, 28, 29, 29, 64, 64
    ];

    var inftrees = function inflate_table(type, lens, lens_index, codes, table, table_index, work, opts)
    {
      var bits = opts.bits;
          //here = opts.here; /* table entry for duplication */

      var len = 0;               /* a code's length in bits */
      var sym = 0;               /* index of code symbols */
      var min = 0, max = 0;          /* minimum and maximum code lengths */
      var root = 0;              /* number of index bits for root table */
      var curr = 0;              /* number of index bits for current table */
      var drop = 0;              /* code bits to drop for sub-table */
      var left = 0;                   /* number of prefix codes available */
      var used = 0;              /* code entries in table used */
      var huff = 0;              /* Huffman code */
      var incr;              /* for incrementing code, index */
      var fill;              /* index for replicating entries */
      var low;               /* low bits for current root entry */
      var mask;              /* mask for low root bits */
      var next;             /* next available space in table */
      var base = null;     /* base value table to use */
      var base_index = 0;
    //  var shoextra;    /* extra bits table to use */
      var end;                    /* use base and extra for symbol > end */
      var count = new common.Buf16(MAXBITS + 1); //[MAXBITS+1];    /* number of codes of each length */
      var offs = new common.Buf16(MAXBITS + 1); //[MAXBITS+1];     /* offsets in table for each length */
      var extra = null;
      var extra_index = 0;

      var here_bits, here_op, here_val;

      /*
       Process a set of code lengths to create a canonical Huffman code.  The
       code lengths are lens[0..codes-1].  Each length corresponds to the
       symbols 0..codes-1.  The Huffman code is generated by first sorting the
       symbols by length from short to long, and retaining the symbol order
       for codes with equal lengths.  Then the code starts with all zero bits
       for the first code of the shortest length, and the codes are integer
       increments for the same length, and zeros are appended as the length
       increases.  For the deflate format, these bits are stored backwards
       from their more natural integer increment ordering, and so when the
       decoding tables are built in the large loop below, the integer codes
       are incremented backwards.

       This routine assumes, but does not check, that all of the entries in
       lens[] are in the range 0..MAXBITS.  The caller must assure this.
       1..MAXBITS is interpreted as that code length.  zero means that that
       symbol does not occur in this code.

       The codes are sorted by computing a count of codes for each length,
       creating from that a table of starting indices for each length in the
       sorted table, and then entering the symbols in order in the sorted
       table.  The sorted table is work[], with that space being provided by
       the caller.

       The length counts are used for other purposes as well, i.e. finding
       the minimum and maximum length codes, determining if there are any
       codes at all, checking for a valid set of lengths, and looking ahead
       at length counts to determine sub-table sizes when building the
       decoding tables.
       */

      /* accumulate lengths for codes (assumes lens[] all in 0..MAXBITS) */
      for (len = 0; len <= MAXBITS; len++) {
        count[len] = 0;
      }
      for (sym = 0; sym < codes; sym++) {
        count[lens[lens_index + sym]]++;
      }

      /* bound code lengths, force root to be within code lengths */
      root = bits;
      for (max = MAXBITS; max >= 1; max--) {
        if (count[max] !== 0) { break; }
      }
      if (root > max) {
        root = max;
      }
      if (max === 0) {                     /* no symbols to code at all */
        //table.op[opts.table_index] = 64;  //here.op = (var char)64;    /* invalid code marker */
        //table.bits[opts.table_index] = 1;   //here.bits = (var char)1;
        //table.val[opts.table_index++] = 0;   //here.val = (var short)0;
        table[table_index++] = (1 << 24) | (64 << 16) | 0;


        //table.op[opts.table_index] = 64;
        //table.bits[opts.table_index] = 1;
        //table.val[opts.table_index++] = 0;
        table[table_index++] = (1 << 24) | (64 << 16) | 0;

        opts.bits = 1;
        return 0;     /* no symbols, but wait for decoding to report error */
      }
      for (min = 1; min < max; min++) {
        if (count[min] !== 0) { break; }
      }
      if (root < min) {
        root = min;
      }

      /* check for an over-subscribed or incomplete set of lengths */
      left = 1;
      for (len = 1; len <= MAXBITS; len++) {
        left <<= 1;
        left -= count[len];
        if (left < 0) {
          return -1;
        }        /* over-subscribed */
      }
      if (left > 0 && (type === CODES || max !== 1)) {
        return -1;                      /* incomplete set */
      }

      /* generate offsets into symbol table for each length for sorting */
      offs[1] = 0;
      for (len = 1; len < MAXBITS; len++) {
        offs[len + 1] = offs[len] + count[len];
      }

      /* sort symbols by length, by symbol order within each length */
      for (sym = 0; sym < codes; sym++) {
        if (lens[lens_index + sym] !== 0) {
          work[offs[lens[lens_index + sym]]++] = sym;
        }
      }

      /*
       Create and fill in decoding tables.  In this loop, the table being
       filled is at next and has curr index bits.  The code being used is huff
       with length len.  That code is converted to an index by dropping drop
       bits off of the bottom.  For codes where len is less than drop + curr,
       those top drop + curr - len bits are incremented through all values to
       fill the table with replicated entries.

       root is the number of index bits for the root table.  When len exceeds
       root, sub-tables are created pointed to by the root entry with an index
       of the low root bits of huff.  This is saved in low to check for when a
       new sub-table should be started.  drop is zero when the root table is
       being filled, and drop is root when sub-tables are being filled.

       When a new sub-table is needed, it is necessary to look ahead in the
       code lengths to determine what size sub-table is needed.  The length
       counts are used for this, and so count[] is decremented as codes are
       entered in the tables.

       used keeps track of how many table entries have been allocated from the
       provided *table space.  It is checked for LENS and DIST tables against
       the constants ENOUGH_LENS and ENOUGH_DISTS to guard against changes in
       the initial root table size constants.  See the comments in inftrees.h
       for more information.

       sym increments through all symbols, and the loop terminates when
       all codes of length max, i.e. all codes, have been processed.  This
       routine permits incomplete codes, so another loop after this one fills
       in the rest of the decoding tables with invalid code markers.
       */

      /* set up for code type */
      // poor man optimization - use if-else instead of switch,
      // to avoid deopts in old v8
      if (type === CODES) {
        base = extra = work;    /* dummy value--not used */
        end = 19;

      } else if (type === LENS) {
        base = lbase;
        base_index -= 257;
        extra = lext;
        extra_index -= 257;
        end = 256;

      } else {                    /* DISTS */
        base = dbase;
        extra = dext;
        end = -1;
      }

      /* initialize opts for loop */
      huff = 0;                   /* starting code */
      sym = 0;                    /* starting code symbol */
      len = min;                  /* starting code length */
      next = table_index;              /* current table to fill in */
      curr = root;                /* current table index bits */
      drop = 0;                   /* current bits to drop from code for index */
      low = -1;                   /* trigger new sub-table when len > root */
      used = 1 << root;          /* use root table entries */
      mask = used - 1;            /* mask for comparing low */

      /* check available table space */
      if ((type === LENS && used > ENOUGH_LENS) ||
        (type === DISTS && used > ENOUGH_DISTS)) {
        return 1;
      }

      /* process all codes and make table entries */
      for (;;) {
        /* create table entry */
        here_bits = len - drop;
        if (work[sym] < end) {
          here_op = 0;
          here_val = work[sym];
        }
        else if (work[sym] > end) {
          here_op = extra[extra_index + work[sym]];
          here_val = base[base_index + work[sym]];
        }
        else {
          here_op = 32 + 64;         /* end of block */
          here_val = 0;
        }

        /* replicate for those indices with low len bits equal to huff */
        incr = 1 << (len - drop);
        fill = 1 << curr;
        min = fill;                 /* save offset to next table */
        do {
          fill -= incr;
          table[next + (huff >> drop) + fill] = (here_bits << 24) | (here_op << 16) | here_val |0;
        } while (fill !== 0);

        /* backwards increment the len-bit code huff */
        incr = 1 << (len - 1);
        while (huff & incr) {
          incr >>= 1;
        }
        if (incr !== 0) {
          huff &= incr - 1;
          huff += incr;
        } else {
          huff = 0;
        }

        /* go to next symbol, update count, len */
        sym++;
        if (--count[len] === 0) {
          if (len === max) { break; }
          len = lens[lens_index + work[sym]];
        }

        /* create new sub-table if needed */
        if (len > root && (huff & mask) !== low) {
          /* if first time, transition to sub-tables */
          if (drop === 0) {
            drop = root;
          }

          /* increment past last table */
          next += min;            /* here min is 1 << curr */

          /* determine length of next table */
          curr = len - drop;
          left = 1 << curr;
          while (curr + drop < max) {
            left -= count[curr + drop];
            if (left <= 0) { break; }
            curr++;
            left <<= 1;
          }

          /* check for enough space */
          used += 1 << curr;
          if ((type === LENS && used > ENOUGH_LENS) ||
            (type === DISTS && used > ENOUGH_DISTS)) {
            return 1;
          }

          /* point entry in root table to sub-table */
          low = huff & mask;
          /*table.op[low] = curr;
          table.bits[low] = root;
          table.val[low] = next - opts.table_index;*/
          table[low] = (root << 24) | (curr << 16) | (next - table_index) |0;
        }
      }

      /* fill in remaining table entry if code is incomplete (guaranteed to have
       at most one remaining entry, since if the code is incomplete, the
       maximum code length that was allowed to get this far is one bit) */
      if (huff !== 0) {
        //table.op[next + huff] = 64;            /* invalid code marker */
        //table.bits[next + huff] = len - drop;
        //table.val[next + huff] = 0;
        table[next + huff] = ((len - drop) << 24) | (64 << 16) |0;
      }

      /* set return parameters */
      //opts.table_index += used;
      opts.bits = root;
      return 0;
    };

    // (C) 1995-2013 Jean-loup Gailly and Mark Adler
    // (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
    //
    // This software is provided 'as-is', without any express or implied
    // warranty. In no event will the authors be held liable for any damages
    // arising from the use of this software.
    //
    // Permission is granted to anyone to use this software for any purpose,
    // including commercial applications, and to alter it and redistribute it
    // freely, subject to the following restrictions:
    //
    // 1. The origin of this software must not be misrepresented; you must not
    //   claim that you wrote the original software. If you use this software
    //   in a product, an acknowledgment in the product documentation would be
    //   appreciated but is not required.
    // 2. Altered source versions must be plainly marked as such, and must not be
    //   misrepresented as being the original software.
    // 3. This notice may not be removed or altered from any source distribution.







    var CODES$1 = 0;
    var LENS$1 = 1;
    var DISTS$1 = 2;

    /* Public constants ==========================================================*/
    /* ===========================================================================*/


    /* Allowed flush values; see deflate() and inflate() below for details */
    //var Z_NO_FLUSH      = 0;
    //var Z_PARTIAL_FLUSH = 1;
    //var Z_SYNC_FLUSH    = 2;
    //var Z_FULL_FLUSH    = 3;
    var Z_FINISH$2        = 4;
    var Z_BLOCK$1         = 5;
    var Z_TREES         = 6;


    /* Return codes for the compression/decompression functions. Negative values
     * are errors, positive values are used for special but normal events.
     */
    var Z_OK$2            = 0;
    var Z_STREAM_END$2    = 1;
    var Z_NEED_DICT     = 2;
    //var Z_ERRNO         = -1;
    var Z_STREAM_ERROR$1  = -2;
    var Z_DATA_ERROR$1    = -3;
    var Z_MEM_ERROR     = -4;
    var Z_BUF_ERROR$1     = -5;
    //var Z_VERSION_ERROR = -6;

    /* The deflate compression method */
    var Z_DEFLATED$2  = 8;


    /* STATES ====================================================================*/
    /* ===========================================================================*/


    var    HEAD = 1;       /* i: waiting for magic header */
    var    FLAGS = 2;      /* i: waiting for method and flags (gzip) */
    var    TIME = 3;       /* i: waiting for modification time (gzip) */
    var    OS = 4;         /* i: waiting for extra flags and operating system (gzip) */
    var    EXLEN = 5;      /* i: waiting for extra length (gzip) */
    var    EXTRA = 6;      /* i: waiting for extra bytes (gzip) */
    var    NAME = 7;       /* i: waiting for end of file name (gzip) */
    var    COMMENT = 8;    /* i: waiting for end of comment (gzip) */
    var    HCRC = 9;       /* i: waiting for header crc (gzip) */
    var    DICTID = 10;    /* i: waiting for dictionary check value */
    var    DICT = 11;      /* waiting for inflateSetDictionary() call */
    var        TYPE$1 = 12;      /* i: waiting for type bits, including last-flag bit */
    var        TYPEDO = 13;    /* i: same, but skip check to exit inflate on new block */
    var        STORED = 14;    /* i: waiting for stored size (length and complement) */
    var        COPY_ = 15;     /* i/o: same as COPY below, but only first time in */
    var        COPY = 16;      /* i/o: waiting for input or output to copy stored block */
    var        TABLE = 17;     /* i: waiting for dynamic block table lengths */
    var        LENLENS = 18;   /* i: waiting for code length code lengths */
    var        CODELENS = 19;  /* i: waiting for length/lit and distance code lengths */
    var            LEN_ = 20;      /* i: same as LEN below, but only first time in */
    var            LEN = 21;       /* i: waiting for length/lit/eob code */
    var            LENEXT = 22;    /* i: waiting for length extra bits */
    var            DIST = 23;      /* i: waiting for distance code */
    var            DISTEXT = 24;   /* i: waiting for distance extra bits */
    var            MATCH = 25;     /* o: waiting for output space to copy string */
    var            LIT = 26;       /* o: waiting for output space to write literal */
    var    CHECK = 27;     /* i: waiting for 32-bit check value */
    var    LENGTH = 28;    /* i: waiting for 32-bit length (gzip) */
    var    DONE = 29;      /* finished check, done -- remain here until reset */
    var    BAD$1 = 30;       /* got a data error -- remain here until reset */
    var    MEM = 31;       /* got an inflate() memory error -- remain here until reset */
    var    SYNC = 32;      /* looking for synchronization bytes to restart inflate() */

    /* ===========================================================================*/



    var ENOUGH_LENS$1 = 852;
    var ENOUGH_DISTS$1 = 592;
    //var ENOUGH =  (ENOUGH_LENS+ENOUGH_DISTS);

    var MAX_WBITS$1 = 15;
    /* 32K LZ77 window */
    var DEF_WBITS = MAX_WBITS$1;


    function zswap32(q) {
      return  (((q >>> 24) & 0xff) +
              ((q >>> 8) & 0xff00) +
              ((q & 0xff00) << 8) +
              ((q & 0xff) << 24));
    }


    function InflateState() {
      this.mode = 0;             /* current inflate mode */
      this.last = false;          /* true if processing last block */
      this.wrap = 0;              /* bit 0 true for zlib, bit 1 true for gzip */
      this.havedict = false;      /* true if dictionary provided */
      this.flags = 0;             /* gzip header method and flags (0 if zlib) */
      this.dmax = 0;              /* zlib header max distance (INFLATE_STRICT) */
      this.check = 0;             /* protected copy of check value */
      this.total = 0;             /* protected copy of output count */
      // TODO: may be {}
      this.head = null;           /* where to save gzip header information */

      /* sliding window */
      this.wbits = 0;             /* log base 2 of requested window size */
      this.wsize = 0;             /* window size or zero if not using window */
      this.whave = 0;             /* valid bytes in the window */
      this.wnext = 0;             /* window write index */
      this.window = null;         /* allocated sliding window, if needed */

      /* bit accumulator */
      this.hold = 0;              /* input bit accumulator */
      this.bits = 0;              /* number of bits in "in" */

      /* for string and stored block copying */
      this.length = 0;            /* literal or length of data to copy */
      this.offset = 0;            /* distance back to copy string from */

      /* for table and code decoding */
      this.extra = 0;             /* extra bits needed */

      /* fixed and dynamic code tables */
      this.lencode = null;          /* starting table for length/literal codes */
      this.distcode = null;         /* starting table for distance codes */
      this.lenbits = 0;           /* index bits for lencode */
      this.distbits = 0;          /* index bits for distcode */

      /* dynamic table building */
      this.ncode = 0;             /* number of code length code lengths */
      this.nlen = 0;              /* number of length code lengths */
      this.ndist = 0;             /* number of distance code lengths */
      this.have = 0;              /* number of code lengths in lens[] */
      this.next = null;              /* next available space in codes[] */

      this.lens = new common.Buf16(320); /* temporary storage for code lengths */
      this.work = new common.Buf16(288); /* work area for code table building */

      /*
       because we don't have pointers in js, we use lencode and distcode directly
       as buffers so we don't need codes
      */
      //this.codes = new utils.Buf32(ENOUGH);       /* space for code tables */
      this.lendyn = null;              /* dynamic table for length/literal codes (JS specific) */
      this.distdyn = null;             /* dynamic table for distance codes (JS specific) */
      this.sane = 0;                   /* if false, allow invalid distance too far */
      this.back = 0;                   /* bits back of last unprocessed length/lit */
      this.was = 0;                    /* initial length of match */
    }

    function inflateResetKeep(strm) {
      var state;

      if (!strm || !strm.state) { return Z_STREAM_ERROR$1; }
      state = strm.state;
      strm.total_in = strm.total_out = state.total = 0;
      strm.msg = ''; /*Z_NULL*/
      if (state.wrap) {       /* to support ill-conceived Java test suite */
        strm.adler = state.wrap & 1;
      }
      state.mode = HEAD;
      state.last = 0;
      state.havedict = 0;
      state.dmax = 32768;
      state.head = null/*Z_NULL*/;
      state.hold = 0;
      state.bits = 0;
      //state.lencode = state.distcode = state.next = state.codes;
      state.lencode = state.lendyn = new common.Buf32(ENOUGH_LENS$1);
      state.distcode = state.distdyn = new common.Buf32(ENOUGH_DISTS$1);

      state.sane = 1;
      state.back = -1;
      //Tracev((stderr, "inflate: reset\n"));
      return Z_OK$2;
    }

    function inflateReset(strm) {
      var state;

      if (!strm || !strm.state) { return Z_STREAM_ERROR$1; }
      state = strm.state;
      state.wsize = 0;
      state.whave = 0;
      state.wnext = 0;
      return inflateResetKeep(strm);

    }

    function inflateReset2(strm, windowBits) {
      var wrap;
      var state;

      /* get the state */
      if (!strm || !strm.state) { return Z_STREAM_ERROR$1; }
      state = strm.state;

      /* extract wrap request from windowBits parameter */
      if (windowBits < 0) {
        wrap = 0;
        windowBits = -windowBits;
      }
      else {
        wrap = (windowBits >> 4) + 1;
        if (windowBits < 48) {
          windowBits &= 15;
        }
      }

      /* set number of window bits, free window if different */
      if (windowBits && (windowBits < 8 || windowBits > 15)) {
        return Z_STREAM_ERROR$1;
      }
      if (state.window !== null && state.wbits !== windowBits) {
        state.window = null;
      }

      /* update state and reset the rest of it */
      state.wrap = wrap;
      state.wbits = windowBits;
      return inflateReset(strm);
    }

    function inflateInit2(strm, windowBits) {
      var ret;
      var state;

      if (!strm) { return Z_STREAM_ERROR$1; }
      //strm.msg = Z_NULL;                 /* in case we return an error */

      state = new InflateState();

      //if (state === Z_NULL) return Z_MEM_ERROR;
      //Tracev((stderr, "inflate: allocated\n"));
      strm.state = state;
      state.window = null/*Z_NULL*/;
      ret = inflateReset2(strm, windowBits);
      if (ret !== Z_OK$2) {
        strm.state = null/*Z_NULL*/;
      }
      return ret;
    }

    function inflateInit(strm) {
      return inflateInit2(strm, DEF_WBITS);
    }


    /*
     Return state with length and distance decoding tables and index sizes set to
     fixed code decoding.  Normally this returns fixed tables from inffixed.h.
     If BUILDFIXED is defined, then instead this routine builds the tables the
     first time it's called, and returns those tables the first time and
     thereafter.  This reduces the size of the code by about 2K bytes, in
     exchange for a little execution time.  However, BUILDFIXED should not be
     used for threaded applications, since the rewriting of the tables and virgin
     may not be thread-safe.
     */
    var virgin = true;

    var lenfix, distfix; // We have no pointers in JS, so keep tables separate

    function fixedtables(state) {
      /* build fixed huffman tables if first call (may not be thread safe) */
      if (virgin) {
        var sym;

        lenfix = new common.Buf32(512);
        distfix = new common.Buf32(32);

        /* literal/length table */
        sym = 0;
        while (sym < 144) { state.lens[sym++] = 8; }
        while (sym < 256) { state.lens[sym++] = 9; }
        while (sym < 280) { state.lens[sym++] = 7; }
        while (sym < 288) { state.lens[sym++] = 8; }

        inftrees(LENS$1,  state.lens, 0, 288, lenfix,   0, state.work, { bits: 9 });

        /* distance table */
        sym = 0;
        while (sym < 32) { state.lens[sym++] = 5; }

        inftrees(DISTS$1, state.lens, 0, 32,   distfix, 0, state.work, { bits: 5 });

        /* do this just once */
        virgin = false;
      }

      state.lencode = lenfix;
      state.lenbits = 9;
      state.distcode = distfix;
      state.distbits = 5;
    }


    /*
     Update the window with the last wsize (normally 32K) bytes written before
     returning.  If window does not exist yet, create it.  This is only called
     when a window is already in use, or when output has been written during this
     inflate call, but the end of the deflate stream has not been reached yet.
     It is also called to create a window for dictionary data when a dictionary
     is loaded.

     Providing output buffers larger than 32K to inflate() should provide a speed
     advantage, since only the last 32K of output is copied to the sliding window
     upon return from inflate(), and since all distances after the first 32K of
     output will fall in the output data, making match copies simpler and faster.
     The advantage may be dependent on the size of the processor's data caches.
     */
    function updatewindow(strm, src, end, copy) {
      var dist;
      var state = strm.state;

      /* if it hasn't been done already, allocate space for the window */
      if (state.window === null) {
        state.wsize = 1 << state.wbits;
        state.wnext = 0;
        state.whave = 0;

        state.window = new common.Buf8(state.wsize);
      }

      /* copy state->wsize or less output bytes into the circular window */
      if (copy >= state.wsize) {
        common.arraySet(state.window, src, end - state.wsize, state.wsize, 0);
        state.wnext = 0;
        state.whave = state.wsize;
      }
      else {
        dist = state.wsize - state.wnext;
        if (dist > copy) {
          dist = copy;
        }
        //zmemcpy(state->window + state->wnext, end - copy, dist);
        common.arraySet(state.window, src, end - copy, dist, state.wnext);
        copy -= dist;
        if (copy) {
          //zmemcpy(state->window, end - copy, copy);
          common.arraySet(state.window, src, end - copy, copy, 0);
          state.wnext = copy;
          state.whave = state.wsize;
        }
        else {
          state.wnext += dist;
          if (state.wnext === state.wsize) { state.wnext = 0; }
          if (state.whave < state.wsize) { state.whave += dist; }
        }
      }
      return 0;
    }

    function inflate(strm, flush) {
      var state;
      var input, output;          // input/output buffers
      var next;                   /* next input INDEX */
      var put;                    /* next output INDEX */
      var have, left;             /* available input and output */
      var hold;                   /* bit buffer */
      var bits;                   /* bits in bit buffer */
      var _in, _out;              /* save starting available input and output */
      var copy;                   /* number of stored or match bytes to copy */
      var from;                   /* where to copy match bytes from */
      var from_source;
      var here = 0;               /* current decoding table entry */
      var here_bits, here_op, here_val; // paked "here" denormalized (JS specific)
      //var last;                   /* parent table entry */
      var last_bits, last_op, last_val; // paked "last" denormalized (JS specific)
      var len;                    /* length to copy for repeats, bits to drop */
      var ret;                    /* return code */
      var hbuf = new common.Buf8(4);    /* buffer for gzip header crc calculation */
      var opts;

      var n; // temporary var for NEED_BITS

      var order = /* permutation of code lengths */
        [ 16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15 ];


      if (!strm || !strm.state || !strm.output ||
          (!strm.input && strm.avail_in !== 0)) {
        return Z_STREAM_ERROR$1;
      }

      state = strm.state;
      if (state.mode === TYPE$1) { state.mode = TYPEDO; }    /* skip check */


      //--- LOAD() ---
      put = strm.next_out;
      output = strm.output;
      left = strm.avail_out;
      next = strm.next_in;
      input = strm.input;
      have = strm.avail_in;
      hold = state.hold;
      bits = state.bits;
      //---

      _in = have;
      _out = left;
      ret = Z_OK$2;

      inf_leave: // goto emulation
      for (;;) {
        switch (state.mode) {
          case HEAD:
            if (state.wrap === 0) {
              state.mode = TYPEDO;
              break;
            }
            //=== NEEDBITS(16);
            while (bits < 16) {
              if (have === 0) { break inf_leave; }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            //===//
            if ((state.wrap & 2) && hold === 0x8b1f) {  /* gzip header */
              state.check = 0/*crc32(0L, Z_NULL, 0)*/;
              //=== CRC2(state.check, hold);
              hbuf[0] = hold & 0xff;
              hbuf[1] = (hold >>> 8) & 0xff;
              state.check = crc32_1$1(state.check, hbuf, 2, 0);
              //===//

              //=== INITBITS();
              hold = 0;
              bits = 0;
              //===//
              state.mode = FLAGS;
              break;
            }
            state.flags = 0;           /* expect zlib header */
            if (state.head) {
              state.head.done = false;
            }
            if (!(state.wrap & 1) ||   /* check if zlib header allowed */
              (((hold & 0xff)/*BITS(8)*/ << 8) + (hold >> 8)) % 31) {
              strm.msg = 'incorrect header check';
              state.mode = BAD$1;
              break;
            }
            if ((hold & 0x0f)/*BITS(4)*/ !== Z_DEFLATED$2) {
              strm.msg = 'unknown compression method';
              state.mode = BAD$1;
              break;
            }
            //--- DROPBITS(4) ---//
            hold >>>= 4;
            bits -= 4;
            //---//
            len = (hold & 0x0f)/*BITS(4)*/ + 8;
            if (state.wbits === 0) {
              state.wbits = len;
            }
            else if (len > state.wbits) {
              strm.msg = 'invalid window size';
              state.mode = BAD$1;
              break;
            }
            state.dmax = 1 << len;
            //Tracev((stderr, "inflate:   zlib header ok\n"));
            strm.adler = state.check = 1/*adler32(0L, Z_NULL, 0)*/;
            state.mode = hold & 0x200 ? DICTID : TYPE$1;
            //=== INITBITS();
            hold = 0;
            bits = 0;
            //===//
            break;
          case FLAGS:
            //=== NEEDBITS(16); */
            while (bits < 16) {
              if (have === 0) { break inf_leave; }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            //===//
            state.flags = hold;
            if ((state.flags & 0xff) !== Z_DEFLATED$2) {
              strm.msg = 'unknown compression method';
              state.mode = BAD$1;
              break;
            }
            if (state.flags & 0xe000) {
              strm.msg = 'unknown header flags set';
              state.mode = BAD$1;
              break;
            }
            if (state.head) {
              state.head.text = ((hold >> 8) & 1);
            }
            if (state.flags & 0x0200) {
              //=== CRC2(state.check, hold);
              hbuf[0] = hold & 0xff;
              hbuf[1] = (hold >>> 8) & 0xff;
              state.check = crc32_1$1(state.check, hbuf, 2, 0);
              //===//
            }
            //=== INITBITS();
            hold = 0;
            bits = 0;
            //===//
            state.mode = TIME;
            /* falls through */
          case TIME:
            //=== NEEDBITS(32); */
            while (bits < 32) {
              if (have === 0) { break inf_leave; }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            //===//
            if (state.head) {
              state.head.time = hold;
            }
            if (state.flags & 0x0200) {
              //=== CRC4(state.check, hold)
              hbuf[0] = hold & 0xff;
              hbuf[1] = (hold >>> 8) & 0xff;
              hbuf[2] = (hold >>> 16) & 0xff;
              hbuf[3] = (hold >>> 24) & 0xff;
              state.check = crc32_1$1(state.check, hbuf, 4, 0);
              //===
            }
            //=== INITBITS();
            hold = 0;
            bits = 0;
            //===//
            state.mode = OS;
            /* falls through */
          case OS:
            //=== NEEDBITS(16); */
            while (bits < 16) {
              if (have === 0) { break inf_leave; }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            //===//
            if (state.head) {
              state.head.xflags = (hold & 0xff);
              state.head.os = (hold >> 8);
            }
            if (state.flags & 0x0200) {
              //=== CRC2(state.check, hold);
              hbuf[0] = hold & 0xff;
              hbuf[1] = (hold >>> 8) & 0xff;
              state.check = crc32_1$1(state.check, hbuf, 2, 0);
              //===//
            }
            //=== INITBITS();
            hold = 0;
            bits = 0;
            //===//
            state.mode = EXLEN;
            /* falls through */
          case EXLEN:
            if (state.flags & 0x0400) {
              //=== NEEDBITS(16); */
              while (bits < 16) {
                if (have === 0) { break inf_leave; }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              //===//
              state.length = hold;
              if (state.head) {
                state.head.extra_len = hold;
              }
              if (state.flags & 0x0200) {
                //=== CRC2(state.check, hold);
                hbuf[0] = hold & 0xff;
                hbuf[1] = (hold >>> 8) & 0xff;
                state.check = crc32_1$1(state.check, hbuf, 2, 0);
                //===//
              }
              //=== INITBITS();
              hold = 0;
              bits = 0;
              //===//
            }
            else if (state.head) {
              state.head.extra = null/*Z_NULL*/;
            }
            state.mode = EXTRA;
            /* falls through */
          case EXTRA:
            if (state.flags & 0x0400) {
              copy = state.length;
              if (copy > have) { copy = have; }
              if (copy) {
                if (state.head) {
                  len = state.head.extra_len - state.length;
                  if (!state.head.extra) {
                    // Use untyped array for more convenient processing later
                    state.head.extra = new Array(state.head.extra_len);
                  }
                  common.arraySet(
                    state.head.extra,
                    input,
                    next,
                    // extra field is limited to 65536 bytes
                    // - no need for additional size check
                    copy,
                    /*len + copy > state.head.extra_max - len ? state.head.extra_max : copy,*/
                    len
                  );
                  //zmemcpy(state.head.extra + len, next,
                  //        len + copy > state.head.extra_max ?
                  //        state.head.extra_max - len : copy);
                }
                if (state.flags & 0x0200) {
                  state.check = crc32_1$1(state.check, input, copy, next);
                }
                have -= copy;
                next += copy;
                state.length -= copy;
              }
              if (state.length) { break inf_leave; }
            }
            state.length = 0;
            state.mode = NAME;
            /* falls through */
          case NAME:
            if (state.flags & 0x0800) {
              if (have === 0) { break inf_leave; }
              copy = 0;
              do {
                // TODO: 2 or 1 bytes?
                len = input[next + copy++];
                /* use constant limit because in js we should not preallocate memory */
                if (state.head && len &&
                    (state.length < 65536 /*state.head.name_max*/)) {
                  state.head.name += String.fromCharCode(len);
                }
              } while (len && copy < have);

              if (state.flags & 0x0200) {
                state.check = crc32_1$1(state.check, input, copy, next);
              }
              have -= copy;
              next += copy;
              if (len) { break inf_leave; }
            }
            else if (state.head) {
              state.head.name = null;
            }
            state.length = 0;
            state.mode = COMMENT;
            /* falls through */
          case COMMENT:
            if (state.flags & 0x1000) {
              if (have === 0) { break inf_leave; }
              copy = 0;
              do {
                len = input[next + copy++];
                /* use constant limit because in js we should not preallocate memory */
                if (state.head && len &&
                    (state.length < 65536 /*state.head.comm_max*/)) {
                  state.head.comment += String.fromCharCode(len);
                }
              } while (len && copy < have);
              if (state.flags & 0x0200) {
                state.check = crc32_1$1(state.check, input, copy, next);
              }
              have -= copy;
              next += copy;
              if (len) { break inf_leave; }
            }
            else if (state.head) {
              state.head.comment = null;
            }
            state.mode = HCRC;
            /* falls through */
          case HCRC:
            if (state.flags & 0x0200) {
              //=== NEEDBITS(16); */
              while (bits < 16) {
                if (have === 0) { break inf_leave; }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              //===//
              if (hold !== (state.check & 0xffff)) {
                strm.msg = 'header crc mismatch';
                state.mode = BAD$1;
                break;
              }
              //=== INITBITS();
              hold = 0;
              bits = 0;
              //===//
            }
            if (state.head) {
              state.head.hcrc = ((state.flags >> 9) & 1);
              state.head.done = true;
            }
            strm.adler = state.check = 0;
            state.mode = TYPE$1;
            break;
          case DICTID:
            //=== NEEDBITS(32); */
            while (bits < 32) {
              if (have === 0) { break inf_leave; }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            //===//
            strm.adler = state.check = zswap32(hold);
            //=== INITBITS();
            hold = 0;
            bits = 0;
            //===//
            state.mode = DICT;
            /* falls through */
          case DICT:
            if (state.havedict === 0) {
              //--- RESTORE() ---
              strm.next_out = put;
              strm.avail_out = left;
              strm.next_in = next;
              strm.avail_in = have;
              state.hold = hold;
              state.bits = bits;
              //---
              return Z_NEED_DICT;
            }
            strm.adler = state.check = 1/*adler32(0L, Z_NULL, 0)*/;
            state.mode = TYPE$1;
            /* falls through */
          case TYPE$1:
            if (flush === Z_BLOCK$1 || flush === Z_TREES) { break inf_leave; }
            /* falls through */
          case TYPEDO:
            if (state.last) {
              //--- BYTEBITS() ---//
              hold >>>= bits & 7;
              bits -= bits & 7;
              //---//
              state.mode = CHECK;
              break;
            }
            //=== NEEDBITS(3); */
            while (bits < 3) {
              if (have === 0) { break inf_leave; }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            //===//
            state.last = (hold & 0x01)/*BITS(1)*/;
            //--- DROPBITS(1) ---//
            hold >>>= 1;
            bits -= 1;
            //---//

            switch ((hold & 0x03)/*BITS(2)*/) {
              case 0:                             /* stored block */
                //Tracev((stderr, "inflate:     stored block%s\n",
                //        state.last ? " (last)" : ""));
                state.mode = STORED;
                break;
              case 1:                             /* fixed block */
                fixedtables(state);
                //Tracev((stderr, "inflate:     fixed codes block%s\n",
                //        state.last ? " (last)" : ""));
                state.mode = LEN_;             /* decode codes */
                if (flush === Z_TREES) {
                  //--- DROPBITS(2) ---//
                  hold >>>= 2;
                  bits -= 2;
                  //---//
                  break inf_leave;
                }
                break;
              case 2:                             /* dynamic block */
                //Tracev((stderr, "inflate:     dynamic codes block%s\n",
                //        state.last ? " (last)" : ""));
                state.mode = TABLE;
                break;
              case 3:
                strm.msg = 'invalid block type';
                state.mode = BAD$1;
            }
            //--- DROPBITS(2) ---//
            hold >>>= 2;
            bits -= 2;
            //---//
            break;
          case STORED:
            //--- BYTEBITS() ---// /* go to byte boundary */
            hold >>>= bits & 7;
            bits -= bits & 7;
            //---//
            //=== NEEDBITS(32); */
            while (bits < 32) {
              if (have === 0) { break inf_leave; }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            //===//
            if ((hold & 0xffff) !== ((hold >>> 16) ^ 0xffff)) {
              strm.msg = 'invalid stored block lengths';
              state.mode = BAD$1;
              break;
            }
            state.length = hold & 0xffff;
            //Tracev((stderr, "inflate:       stored length %u\n",
            //        state.length));
            //=== INITBITS();
            hold = 0;
            bits = 0;
            //===//
            state.mode = COPY_;
            if (flush === Z_TREES) { break inf_leave; }
            /* falls through */
          case COPY_:
            state.mode = COPY;
            /* falls through */
          case COPY:
            copy = state.length;
            if (copy) {
              if (copy > have) { copy = have; }
              if (copy > left) { copy = left; }
              if (copy === 0) { break inf_leave; }
              //--- zmemcpy(put, next, copy); ---
              common.arraySet(output, input, next, copy, put);
              //---//
              have -= copy;
              next += copy;
              left -= copy;
              put += copy;
              state.length -= copy;
              break;
            }
            //Tracev((stderr, "inflate:       stored end\n"));
            state.mode = TYPE$1;
            break;
          case TABLE:
            //=== NEEDBITS(14); */
            while (bits < 14) {
              if (have === 0) { break inf_leave; }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            //===//
            state.nlen = (hold & 0x1f)/*BITS(5)*/ + 257;
            //--- DROPBITS(5) ---//
            hold >>>= 5;
            bits -= 5;
            //---//
            state.ndist = (hold & 0x1f)/*BITS(5)*/ + 1;
            //--- DROPBITS(5) ---//
            hold >>>= 5;
            bits -= 5;
            //---//
            state.ncode = (hold & 0x0f)/*BITS(4)*/ + 4;
            //--- DROPBITS(4) ---//
            hold >>>= 4;
            bits -= 4;
            //---//
    //#ifndef PKZIP_BUG_WORKAROUND
            if (state.nlen > 286 || state.ndist > 30) {
              strm.msg = 'too many length or distance symbols';
              state.mode = BAD$1;
              break;
            }
    //#endif
            //Tracev((stderr, "inflate:       table sizes ok\n"));
            state.have = 0;
            state.mode = LENLENS;
            /* falls through */
          case LENLENS:
            while (state.have < state.ncode) {
              //=== NEEDBITS(3);
              while (bits < 3) {
                if (have === 0) { break inf_leave; }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              //===//
              state.lens[order[state.have++]] = (hold & 0x07);//BITS(3);
              //--- DROPBITS(3) ---//
              hold >>>= 3;
              bits -= 3;
              //---//
            }
            while (state.have < 19) {
              state.lens[order[state.have++]] = 0;
            }
            // We have separate tables & no pointers. 2 commented lines below not needed.
            //state.next = state.codes;
            //state.lencode = state.next;
            // Switch to use dynamic table
            state.lencode = state.lendyn;
            state.lenbits = 7;

            opts = { bits: state.lenbits };
            ret = inftrees(CODES$1, state.lens, 0, 19, state.lencode, 0, state.work, opts);
            state.lenbits = opts.bits;

            if (ret) {
              strm.msg = 'invalid code lengths set';
              state.mode = BAD$1;
              break;
            }
            //Tracev((stderr, "inflate:       code lengths ok\n"));
            state.have = 0;
            state.mode = CODELENS;
            /* falls through */
          case CODELENS:
            while (state.have < state.nlen + state.ndist) {
              for (;;) {
                here = state.lencode[hold & ((1 << state.lenbits) - 1)];/*BITS(state.lenbits)*/
                here_bits = here >>> 24;
                here_op = (here >>> 16) & 0xff;
                here_val = here & 0xffff;

                if ((here_bits) <= bits) { break; }
                //--- PULLBYTE() ---//
                if (have === 0) { break inf_leave; }
                have--;
                hold += input[next++] << bits;
                bits += 8;
                //---//
              }
              if (here_val < 16) {
                //--- DROPBITS(here.bits) ---//
                hold >>>= here_bits;
                bits -= here_bits;
                //---//
                state.lens[state.have++] = here_val;
              }
              else {
                if (here_val === 16) {
                  //=== NEEDBITS(here.bits + 2);
                  n = here_bits + 2;
                  while (bits < n) {
                    if (have === 0) { break inf_leave; }
                    have--;
                    hold += input[next++] << bits;
                    bits += 8;
                  }
                  //===//
                  //--- DROPBITS(here.bits) ---//
                  hold >>>= here_bits;
                  bits -= here_bits;
                  //---//
                  if (state.have === 0) {
                    strm.msg = 'invalid bit length repeat';
                    state.mode = BAD$1;
                    break;
                  }
                  len = state.lens[state.have - 1];
                  copy = 3 + (hold & 0x03);//BITS(2);
                  //--- DROPBITS(2) ---//
                  hold >>>= 2;
                  bits -= 2;
                  //---//
                }
                else if (here_val === 17) {
                  //=== NEEDBITS(here.bits + 3);
                  n = here_bits + 3;
                  while (bits < n) {
                    if (have === 0) { break inf_leave; }
                    have--;
                    hold += input[next++] << bits;
                    bits += 8;
                  }
                  //===//
                  //--- DROPBITS(here.bits) ---//
                  hold >>>= here_bits;
                  bits -= here_bits;
                  //---//
                  len = 0;
                  copy = 3 + (hold & 0x07);//BITS(3);
                  //--- DROPBITS(3) ---//
                  hold >>>= 3;
                  bits -= 3;
                  //---//
                }
                else {
                  //=== NEEDBITS(here.bits + 7);
                  n = here_bits + 7;
                  while (bits < n) {
                    if (have === 0) { break inf_leave; }
                    have--;
                    hold += input[next++] << bits;
                    bits += 8;
                  }
                  //===//
                  //--- DROPBITS(here.bits) ---//
                  hold >>>= here_bits;
                  bits -= here_bits;
                  //---//
                  len = 0;
                  copy = 11 + (hold & 0x7f);//BITS(7);
                  //--- DROPBITS(7) ---//
                  hold >>>= 7;
                  bits -= 7;
                  //---//
                }
                if (state.have + copy > state.nlen + state.ndist) {
                  strm.msg = 'invalid bit length repeat';
                  state.mode = BAD$1;
                  break;
                }
                while (copy--) {
                  state.lens[state.have++] = len;
                }
              }
            }

            /* handle error breaks in while */
            if (state.mode === BAD$1) { break; }

            /* check for end-of-block code (better have one) */
            if (state.lens[256] === 0) {
              strm.msg = 'invalid code -- missing end-of-block';
              state.mode = BAD$1;
              break;
            }

            /* build code tables -- note: do not change the lenbits or distbits
               values here (9 and 6) without reading the comments in inftrees.h
               concerning the ENOUGH constants, which depend on those values */
            state.lenbits = 9;

            opts = { bits: state.lenbits };
            ret = inftrees(LENS$1, state.lens, 0, state.nlen, state.lencode, 0, state.work, opts);
            // We have separate tables & no pointers. 2 commented lines below not needed.
            // state.next_index = opts.table_index;
            state.lenbits = opts.bits;
            // state.lencode = state.next;

            if (ret) {
              strm.msg = 'invalid literal/lengths set';
              state.mode = BAD$1;
              break;
            }

            state.distbits = 6;
            //state.distcode.copy(state.codes);
            // Switch to use dynamic table
            state.distcode = state.distdyn;
            opts = { bits: state.distbits };
            ret = inftrees(DISTS$1, state.lens, state.nlen, state.ndist, state.distcode, 0, state.work, opts);
            // We have separate tables & no pointers. 2 commented lines below not needed.
            // state.next_index = opts.table_index;
            state.distbits = opts.bits;
            // state.distcode = state.next;

            if (ret) {
              strm.msg = 'invalid distances set';
              state.mode = BAD$1;
              break;
            }
            //Tracev((stderr, 'inflate:       codes ok\n'));
            state.mode = LEN_;
            if (flush === Z_TREES) { break inf_leave; }
            /* falls through */
          case LEN_:
            state.mode = LEN;
            /* falls through */
          case LEN:
            if (have >= 6 && left >= 258) {
              //--- RESTORE() ---
              strm.next_out = put;
              strm.avail_out = left;
              strm.next_in = next;
              strm.avail_in = have;
              state.hold = hold;
              state.bits = bits;
              //---
              inffast(strm, _out);
              //--- LOAD() ---
              put = strm.next_out;
              output = strm.output;
              left = strm.avail_out;
              next = strm.next_in;
              input = strm.input;
              have = strm.avail_in;
              hold = state.hold;
              bits = state.bits;
              //---

              if (state.mode === TYPE$1) {
                state.back = -1;
              }
              break;
            }
            state.back = 0;
            for (;;) {
              here = state.lencode[hold & ((1 << state.lenbits) - 1)];  /*BITS(state.lenbits)*/
              here_bits = here >>> 24;
              here_op = (here >>> 16) & 0xff;
              here_val = here & 0xffff;

              if (here_bits <= bits) { break; }
              //--- PULLBYTE() ---//
              if (have === 0) { break inf_leave; }
              have--;
              hold += input[next++] << bits;
              bits += 8;
              //---//
            }
            if (here_op && (here_op & 0xf0) === 0) {
              last_bits = here_bits;
              last_op = here_op;
              last_val = here_val;
              for (;;) {
                here = state.lencode[last_val +
                        ((hold & ((1 << (last_bits + last_op)) - 1))/*BITS(last.bits + last.op)*/ >> last_bits)];
                here_bits = here >>> 24;
                here_op = (here >>> 16) & 0xff;
                here_val = here & 0xffff;

                if ((last_bits + here_bits) <= bits) { break; }
                //--- PULLBYTE() ---//
                if (have === 0) { break inf_leave; }
                have--;
                hold += input[next++] << bits;
                bits += 8;
                //---//
              }
              //--- DROPBITS(last.bits) ---//
              hold >>>= last_bits;
              bits -= last_bits;
              //---//
              state.back += last_bits;
            }
            //--- DROPBITS(here.bits) ---//
            hold >>>= here_bits;
            bits -= here_bits;
            //---//
            state.back += here_bits;
            state.length = here_val;
            if (here_op === 0) {
              //Tracevv((stderr, here.val >= 0x20 && here.val < 0x7f ?
              //        "inflate:         literal '%c'\n" :
              //        "inflate:         literal 0x%02x\n", here.val));
              state.mode = LIT;
              break;
            }
            if (here_op & 32) {
              //Tracevv((stderr, "inflate:         end of block\n"));
              state.back = -1;
              state.mode = TYPE$1;
              break;
            }
            if (here_op & 64) {
              strm.msg = 'invalid literal/length code';
              state.mode = BAD$1;
              break;
            }
            state.extra = here_op & 15;
            state.mode = LENEXT;
            /* falls through */
          case LENEXT:
            if (state.extra) {
              //=== NEEDBITS(state.extra);
              n = state.extra;
              while (bits < n) {
                if (have === 0) { break inf_leave; }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              //===//
              state.length += hold & ((1 << state.extra) - 1)/*BITS(state.extra)*/;
              //--- DROPBITS(state.extra) ---//
              hold >>>= state.extra;
              bits -= state.extra;
              //---//
              state.back += state.extra;
            }
            //Tracevv((stderr, "inflate:         length %u\n", state.length));
            state.was = state.length;
            state.mode = DIST;
            /* falls through */
          case DIST:
            for (;;) {
              here = state.distcode[hold & ((1 << state.distbits) - 1)];/*BITS(state.distbits)*/
              here_bits = here >>> 24;
              here_op = (here >>> 16) & 0xff;
              here_val = here & 0xffff;

              if ((here_bits) <= bits) { break; }
              //--- PULLBYTE() ---//
              if (have === 0) { break inf_leave; }
              have--;
              hold += input[next++] << bits;
              bits += 8;
              //---//
            }
            if ((here_op & 0xf0) === 0) {
              last_bits = here_bits;
              last_op = here_op;
              last_val = here_val;
              for (;;) {
                here = state.distcode[last_val +
                        ((hold & ((1 << (last_bits + last_op)) - 1))/*BITS(last.bits + last.op)*/ >> last_bits)];
                here_bits = here >>> 24;
                here_op = (here >>> 16) & 0xff;
                here_val = here & 0xffff;

                if ((last_bits + here_bits) <= bits) { break; }
                //--- PULLBYTE() ---//
                if (have === 0) { break inf_leave; }
                have--;
                hold += input[next++] << bits;
                bits += 8;
                //---//
              }
              //--- DROPBITS(last.bits) ---//
              hold >>>= last_bits;
              bits -= last_bits;
              //---//
              state.back += last_bits;
            }
            //--- DROPBITS(here.bits) ---//
            hold >>>= here_bits;
            bits -= here_bits;
            //---//
            state.back += here_bits;
            if (here_op & 64) {
              strm.msg = 'invalid distance code';
              state.mode = BAD$1;
              break;
            }
            state.offset = here_val;
            state.extra = (here_op) & 15;
            state.mode = DISTEXT;
            /* falls through */
          case DISTEXT:
            if (state.extra) {
              //=== NEEDBITS(state.extra);
              n = state.extra;
              while (bits < n) {
                if (have === 0) { break inf_leave; }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              //===//
              state.offset += hold & ((1 << state.extra) - 1)/*BITS(state.extra)*/;
              //--- DROPBITS(state.extra) ---//
              hold >>>= state.extra;
              bits -= state.extra;
              //---//
              state.back += state.extra;
            }
    //#ifdef INFLATE_STRICT
            if (state.offset > state.dmax) {
              strm.msg = 'invalid distance too far back';
              state.mode = BAD$1;
              break;
            }
    //#endif
            //Tracevv((stderr, "inflate:         distance %u\n", state.offset));
            state.mode = MATCH;
            /* falls through */
          case MATCH:
            if (left === 0) { break inf_leave; }
            copy = _out - left;
            if (state.offset > copy) {         /* copy from window */
              copy = state.offset - copy;
              if (copy > state.whave) {
                if (state.sane) {
                  strm.msg = 'invalid distance too far back';
                  state.mode = BAD$1;
                  break;
                }
    // (!) This block is disabled in zlib defaults,
    // don't enable it for binary compatibility
    //#ifdef INFLATE_ALLOW_INVALID_DISTANCE_TOOFAR_ARRR
    //          Trace((stderr, "inflate.c too far\n"));
    //          copy -= state.whave;
    //          if (copy > state.length) { copy = state.length; }
    //          if (copy > left) { copy = left; }
    //          left -= copy;
    //          state.length -= copy;
    //          do {
    //            output[put++] = 0;
    //          } while (--copy);
    //          if (state.length === 0) { state.mode = LEN; }
    //          break;
    //#endif
              }
              if (copy > state.wnext) {
                copy -= state.wnext;
                from = state.wsize - copy;
              }
              else {
                from = state.wnext - copy;
              }
              if (copy > state.length) { copy = state.length; }
              from_source = state.window;
            }
            else {                              /* copy from output */
              from_source = output;
              from = put - state.offset;
              copy = state.length;
            }
            if (copy > left) { copy = left; }
            left -= copy;
            state.length -= copy;
            do {
              output[put++] = from_source[from++];
            } while (--copy);
            if (state.length === 0) { state.mode = LEN; }
            break;
          case LIT:
            if (left === 0) { break inf_leave; }
            output[put++] = state.length;
            left--;
            state.mode = LEN;
            break;
          case CHECK:
            if (state.wrap) {
              //=== NEEDBITS(32);
              while (bits < 32) {
                if (have === 0) { break inf_leave; }
                have--;
                // Use '|' instead of '+' to make sure that result is signed
                hold |= input[next++] << bits;
                bits += 8;
              }
              //===//
              _out -= left;
              strm.total_out += _out;
              state.total += _out;
              if (_out) {
                strm.adler = state.check =
                    /*UPDATE(state.check, put - _out, _out);*/
                    (state.flags ? crc32_1$1(state.check, output, _out, put - _out) : adler32_1(state.check, output, _out, put - _out));

              }
              _out = left;
              // NB: crc32 stored as signed 32-bit int, zswap32 returns signed too
              if ((state.flags ? hold : zswap32(hold)) !== state.check) {
                strm.msg = 'incorrect data check';
                state.mode = BAD$1;
                break;
              }
              //=== INITBITS();
              hold = 0;
              bits = 0;
              //===//
              //Tracev((stderr, "inflate:   check matches trailer\n"));
            }
            state.mode = LENGTH;
            /* falls through */
          case LENGTH:
            if (state.wrap && state.flags) {
              //=== NEEDBITS(32);
              while (bits < 32) {
                if (have === 0) { break inf_leave; }
                have--;
                hold += input[next++] << bits;
                bits += 8;
              }
              //===//
              if (hold !== (state.total & 0xffffffff)) {
                strm.msg = 'incorrect length check';
                state.mode = BAD$1;
                break;
              }
              //=== INITBITS();
              hold = 0;
              bits = 0;
              //===//
              //Tracev((stderr, "inflate:   length matches trailer\n"));
            }
            state.mode = DONE;
            /* falls through */
          case DONE:
            ret = Z_STREAM_END$2;
            break inf_leave;
          case BAD$1:
            ret = Z_DATA_ERROR$1;
            break inf_leave;
          case MEM:
            return Z_MEM_ERROR;
          case SYNC:
            /* falls through */
          default:
            return Z_STREAM_ERROR$1;
        }
      }

      // inf_leave <- here is real place for "goto inf_leave", emulated via "break inf_leave"

      /*
         Return from inflate(), updating the total counts and the check value.
         If there was no progress during the inflate() call, return a buffer
         error.  Call updatewindow() to create and/or update the window state.
         Note: a memory error from inflate() is non-recoverable.
       */

      //--- RESTORE() ---
      strm.next_out = put;
      strm.avail_out = left;
      strm.next_in = next;
      strm.avail_in = have;
      state.hold = hold;
      state.bits = bits;
      //---

      if (state.wsize || (_out !== strm.avail_out && state.mode < BAD$1 &&
                          (state.mode < CHECK || flush !== Z_FINISH$2))) {
        if (updatewindow(strm, strm.output, strm.next_out, _out - strm.avail_out)) ;
      }
      _in -= strm.avail_in;
      _out -= strm.avail_out;
      strm.total_in += _in;
      strm.total_out += _out;
      state.total += _out;
      if (state.wrap && _out) {
        strm.adler = state.check = /*UPDATE(state.check, strm.next_out - _out, _out);*/
          (state.flags ? crc32_1$1(state.check, output, _out, strm.next_out - _out) : adler32_1(state.check, output, _out, strm.next_out - _out));
      }
      strm.data_type = state.bits + (state.last ? 64 : 0) +
                        (state.mode === TYPE$1 ? 128 : 0) +
                        (state.mode === LEN_ || state.mode === COPY_ ? 256 : 0);
      if (((_in === 0 && _out === 0) || flush === Z_FINISH$2) && ret === Z_OK$2) {
        ret = Z_BUF_ERROR$1;
      }
      return ret;
    }

    function inflateEnd(strm) {

      if (!strm || !strm.state /*|| strm->zfree == (free_func)0*/) {
        return Z_STREAM_ERROR$1;
      }

      var state = strm.state;
      if (state.window) {
        state.window = null;
      }
      strm.state = null;
      return Z_OK$2;
    }

    function inflateGetHeader(strm, head) {
      var state;

      /* check state */
      if (!strm || !strm.state) { return Z_STREAM_ERROR$1; }
      state = strm.state;
      if ((state.wrap & 2) === 0) { return Z_STREAM_ERROR$1; }

      /* save header structure */
      state.head = head;
      head.done = false;
      return Z_OK$2;
    }

    function inflateSetDictionary(strm, dictionary) {
      var dictLength = dictionary.length;

      var state;
      var dictid;
      var ret;

      /* check state */
      if (!strm /* == Z_NULL */ || !strm.state /* == Z_NULL */) { return Z_STREAM_ERROR$1; }
      state = strm.state;

      if (state.wrap !== 0 && state.mode !== DICT) {
        return Z_STREAM_ERROR$1;
      }

      /* check for correct dictionary identifier */
      if (state.mode === DICT) {
        dictid = 1; /* adler32(0, null, 0)*/
        /* dictid = adler32(dictid, dictionary, dictLength); */
        dictid = adler32_1(dictid, dictionary, dictLength, 0);
        if (dictid !== state.check) {
          return Z_DATA_ERROR$1;
        }
      }
      /* copy dictionary to window using updatewindow(), which will amend the
       existing dictionary if appropriate */
      ret = updatewindow(strm, dictionary, dictLength, dictLength);
      if (ret) {
        state.mode = MEM;
        return Z_MEM_ERROR;
      }
      state.havedict = 1;
      // Tracev((stderr, "inflate:   dictionary set\n"));
      return Z_OK$2;
    }

    var inflateReset_1 = inflateReset;
    var inflateReset2_1 = inflateReset2;
    var inflateResetKeep_1 = inflateResetKeep;
    var inflateInit_1 = inflateInit;
    var inflateInit2_1 = inflateInit2;
    var inflate_2 = inflate;
    var inflateEnd_1 = inflateEnd;
    var inflateGetHeader_1 = inflateGetHeader;
    var inflateSetDictionary_1 = inflateSetDictionary;
    var inflateInfo = 'pako inflate (from Nodeca project)';

    /* Not implemented
    exports.inflateCopy = inflateCopy;
    exports.inflateGetDictionary = inflateGetDictionary;
    exports.inflateMark = inflateMark;
    exports.inflatePrime = inflatePrime;
    exports.inflateSync = inflateSync;
    exports.inflateSyncPoint = inflateSyncPoint;
    exports.inflateUndermine = inflateUndermine;
    */

    var inflate_1 = {
    	inflateReset: inflateReset_1,
    	inflateReset2: inflateReset2_1,
    	inflateResetKeep: inflateResetKeep_1,
    	inflateInit: inflateInit_1,
    	inflateInit2: inflateInit2_1,
    	inflate: inflate_2,
    	inflateEnd: inflateEnd_1,
    	inflateGetHeader: inflateGetHeader_1,
    	inflateSetDictionary: inflateSetDictionary_1,
    	inflateInfo: inflateInfo
    };

    // (C) 1995-2013 Jean-loup Gailly and Mark Adler
    // (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
    //
    // This software is provided 'as-is', without any express or implied
    // warranty. In no event will the authors be held liable for any damages
    // arising from the use of this software.
    //
    // Permission is granted to anyone to use this software for any purpose,
    // including commercial applications, and to alter it and redistribute it
    // freely, subject to the following restrictions:
    //
    // 1. The origin of this software must not be misrepresented; you must not
    //   claim that you wrote the original software. If you use this software
    //   in a product, an acknowledgment in the product documentation would be
    //   appreciated but is not required.
    // 2. Altered source versions must be plainly marked as such, and must not be
    //   misrepresented as being the original software.
    // 3. This notice may not be removed or altered from any source distribution.

    var constants = {

      /* Allowed flush values; see deflate() and inflate() below for details */
      Z_NO_FLUSH:         0,
      Z_PARTIAL_FLUSH:    1,
      Z_SYNC_FLUSH:       2,
      Z_FULL_FLUSH:       3,
      Z_FINISH:           4,
      Z_BLOCK:            5,
      Z_TREES:            6,

      /* Return codes for the compression/decompression functions. Negative values
      * are errors, positive values are used for special but normal events.
      */
      Z_OK:               0,
      Z_STREAM_END:       1,
      Z_NEED_DICT:        2,
      Z_ERRNO:           -1,
      Z_STREAM_ERROR:    -2,
      Z_DATA_ERROR:      -3,
      //Z_MEM_ERROR:     -4,
      Z_BUF_ERROR:       -5,
      //Z_VERSION_ERROR: -6,

      /* compression levels */
      Z_NO_COMPRESSION:         0,
      Z_BEST_SPEED:             1,
      Z_BEST_COMPRESSION:       9,
      Z_DEFAULT_COMPRESSION:   -1,


      Z_FILTERED:               1,
      Z_HUFFMAN_ONLY:           2,
      Z_RLE:                    3,
      Z_FIXED:                  4,
      Z_DEFAULT_STRATEGY:       0,

      /* Possible values of the data_type field (though see inflate()) */
      Z_BINARY:                 0,
      Z_TEXT:                   1,
      //Z_ASCII:                1, // = Z_TEXT (deprecated)
      Z_UNKNOWN:                2,

      /* The deflate compression method */
      Z_DEFLATED:               8
      //Z_NULL:                 null // Use -1 or null inline, depending on var type
    };

    // (C) 1995-2013 Jean-loup Gailly and Mark Adler
    // (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
    //
    // This software is provided 'as-is', without any express or implied
    // warranty. In no event will the authors be held liable for any damages
    // arising from the use of this software.
    //
    // Permission is granted to anyone to use this software for any purpose,
    // including commercial applications, and to alter it and redistribute it
    // freely, subject to the following restrictions:
    //
    // 1. The origin of this software must not be misrepresented; you must not
    //   claim that you wrote the original software. If you use this software
    //   in a product, an acknowledgment in the product documentation would be
    //   appreciated but is not required.
    // 2. Altered source versions must be plainly marked as such, and must not be
    //   misrepresented as being the original software.
    // 3. This notice may not be removed or altered from any source distribution.

    function GZheader() {
      /* true if compressed data believed to be text */
      this.text       = 0;
      /* modification time */
      this.time       = 0;
      /* extra flags (not used when writing a gzip file) */
      this.xflags     = 0;
      /* operating system */
      this.os         = 0;
      /* pointer to extra field or Z_NULL if none */
      this.extra      = null;
      /* extra field length (valid if extra != Z_NULL) */
      this.extra_len  = 0; // Actually, we don't need it in JS,
                           // but leave for few code modifications

      //
      // Setup limits is not necessary because in js we should not preallocate memory
      // for inflate use constant limit in 65536 bytes
      //

      /* space at extra (only when reading header) */
      // this.extra_max  = 0;
      /* pointer to zero-terminated file name or Z_NULL */
      this.name       = '';
      /* space at name (only when reading header) */
      // this.name_max   = 0;
      /* pointer to zero-terminated comment or Z_NULL */
      this.comment    = '';
      /* space at comment (only when reading header) */
      // this.comm_max   = 0;
      /* true if there was or will be a header crc */
      this.hcrc       = 0;
      /* true when done reading gzip header (not used when writing a gzip file) */
      this.done       = false;
    }

    var gzheader = GZheader;

    var toString$2 = Object.prototype.toString;

    /**
     * class Inflate
     *
     * Generic JS-style wrapper for zlib calls. If you don't need
     * streaming behaviour - use more simple functions: [[inflate]]
     * and [[inflateRaw]].
     **/

    /* internal
     * inflate.chunks -> Array
     *
     * Chunks of output data, if [[Inflate#onData]] not overridden.
     **/

    /**
     * Inflate.result -> Uint8Array|Array|String
     *
     * Uncompressed result, generated by default [[Inflate#onData]]
     * and [[Inflate#onEnd]] handlers. Filled after you push last chunk
     * (call [[Inflate#push]] with `Z_FINISH` / `true` param) or if you
     * push a chunk with explicit flush (call [[Inflate#push]] with
     * `Z_SYNC_FLUSH` param).
     **/

    /**
     * Inflate.err -> Number
     *
     * Error code after inflate finished. 0 (Z_OK) on success.
     * Should be checked if broken data possible.
     **/

    /**
     * Inflate.msg -> String
     *
     * Error message, if [[Inflate.err]] != 0
     **/


    /**
     * new Inflate(options)
     * - options (Object): zlib inflate options.
     *
     * Creates new inflator instance with specified params. Throws exception
     * on bad params. Supported options:
     *
     * - `windowBits`
     * - `dictionary`
     *
     * [http://zlib.net/manual.html#Advanced](http://zlib.net/manual.html#Advanced)
     * for more information on these.
     *
     * Additional options, for internal needs:
     *
     * - `chunkSize` - size of generated data chunks (16K by default)
     * - `raw` (Boolean) - do raw inflate
     * - `to` (String) - if equal to 'string', then result will be converted
     *   from utf8 to utf16 (javascript) string. When string output requested,
     *   chunk length can differ from `chunkSize`, depending on content.
     *
     * By default, when no options set, autodetect deflate/gzip data format via
     * wrapper header.
     *
     * ##### Example:
     *
     * ```javascript
     * var pako = require('pako')
     *   , chunk1 = Uint8Array([1,2,3,4,5,6,7,8,9])
     *   , chunk2 = Uint8Array([10,11,12,13,14,15,16,17,18,19]);
     *
     * var inflate = new pako.Inflate({ level: 3});
     *
     * inflate.push(chunk1, false);
     * inflate.push(chunk2, true);  // true -> last chunk
     *
     * if (inflate.err) { throw new Error(inflate.err); }
     *
     * console.log(inflate.result);
     * ```
     **/
    function Inflate(options) {
      if (!(this instanceof Inflate)) return new Inflate(options);

      this.options = common.assign({
        chunkSize: 16384,
        windowBits: 0,
        to: ''
      }, options || {});

      var opt = this.options;

      // Force window size for `raw` data, if not set directly,
      // because we have no header for autodetect.
      if (opt.raw && (opt.windowBits >= 0) && (opt.windowBits < 16)) {
        opt.windowBits = -opt.windowBits;
        if (opt.windowBits === 0) { opt.windowBits = -15; }
      }

      // If `windowBits` not defined (and mode not raw) - set autodetect flag for gzip/deflate
      if ((opt.windowBits >= 0) && (opt.windowBits < 16) &&
          !(options && options.windowBits)) {
        opt.windowBits += 32;
      }

      // Gzip header has no info about windows size, we can do autodetect only
      // for deflate. So, if window size not set, force it to max when gzip possible
      if ((opt.windowBits > 15) && (opt.windowBits < 48)) {
        // bit 3 (16) -> gzipped data
        // bit 4 (32) -> autodetect gzip/deflate
        if ((opt.windowBits & 15) === 0) {
          opt.windowBits |= 15;
        }
      }

      this.err    = 0;      // error code, if happens (0 = Z_OK)
      this.msg    = '';     // error message
      this.ended  = false;  // used to avoid multiple onEnd() calls
      this.chunks = [];     // chunks of compressed data

      this.strm   = new zstream();
      this.strm.avail_out = 0;

      var status  = inflate_1.inflateInit2(
        this.strm,
        opt.windowBits
      );

      if (status !== constants.Z_OK) {
        throw new Error(messages[status]);
      }

      this.header = new gzheader();

      inflate_1.inflateGetHeader(this.strm, this.header);

      // Setup dictionary
      if (opt.dictionary) {
        // Convert data if needed
        if (typeof opt.dictionary === 'string') {
          opt.dictionary = strings.string2buf(opt.dictionary);
        } else if (toString$2.call(opt.dictionary) === '[object ArrayBuffer]') {
          opt.dictionary = new Uint8Array(opt.dictionary);
        }
        if (opt.raw) { //In raw mode we need to set the dictionary early
          status = inflate_1.inflateSetDictionary(this.strm, opt.dictionary);
          if (status !== constants.Z_OK) {
            throw new Error(messages[status]);
          }
        }
      }
    }

    /**
     * Inflate#push(data[, mode]) -> Boolean
     * - data (Uint8Array|Array|ArrayBuffer|String): input data
     * - mode (Number|Boolean): 0..6 for corresponding Z_NO_FLUSH..Z_TREE modes.
     *   See constants. Skipped or `false` means Z_NO_FLUSH, `true` means Z_FINISH.
     *
     * Sends input data to inflate pipe, generating [[Inflate#onData]] calls with
     * new output chunks. Returns `true` on success. The last data block must have
     * mode Z_FINISH (or `true`). That will flush internal pending buffers and call
     * [[Inflate#onEnd]]. For interim explicit flushes (without ending the stream) you
     * can use mode Z_SYNC_FLUSH, keeping the decompression context.
     *
     * On fail call [[Inflate#onEnd]] with error code and return false.
     *
     * We strongly recommend to use `Uint8Array` on input for best speed (output
     * format is detected automatically). Also, don't skip last param and always
     * use the same type in your code (boolean or number). That will improve JS speed.
     *
     * For regular `Array`-s make sure all elements are [0..255].
     *
     * ##### Example
     *
     * ```javascript
     * push(chunk, false); // push one of data chunks
     * ...
     * push(chunk, true);  // push last chunk
     * ```
     **/
    Inflate.prototype.push = function (data, mode) {
      var strm = this.strm;
      var chunkSize = this.options.chunkSize;
      var dictionary = this.options.dictionary;
      var status, _mode;
      var next_out_utf8, tail, utf8str;

      // Flag to properly process Z_BUF_ERROR on testing inflate call
      // when we check that all output data was flushed.
      var allowBufError = false;

      if (this.ended) { return false; }
      _mode = (mode === ~~mode) ? mode : ((mode === true) ? constants.Z_FINISH : constants.Z_NO_FLUSH);

      // Convert data if needed
      if (typeof data === 'string') {
        // Only binary strings can be decompressed on practice
        strm.input = strings.binstring2buf(data);
      } else if (toString$2.call(data) === '[object ArrayBuffer]') {
        strm.input = new Uint8Array(data);
      } else {
        strm.input = data;
      }

      strm.next_in = 0;
      strm.avail_in = strm.input.length;

      do {
        if (strm.avail_out === 0) {
          strm.output = new common.Buf8(chunkSize);
          strm.next_out = 0;
          strm.avail_out = chunkSize;
        }

        status = inflate_1.inflate(strm, constants.Z_NO_FLUSH);    /* no bad return value */

        if (status === constants.Z_NEED_DICT && dictionary) {
          status = inflate_1.inflateSetDictionary(this.strm, dictionary);
        }

        if (status === constants.Z_BUF_ERROR && allowBufError === true) {
          status = constants.Z_OK;
          allowBufError = false;
        }

        if (status !== constants.Z_STREAM_END && status !== constants.Z_OK) {
          this.onEnd(status);
          this.ended = true;
          return false;
        }

        if (strm.next_out) {
          if (strm.avail_out === 0 || status === constants.Z_STREAM_END || (strm.avail_in === 0 && (_mode === constants.Z_FINISH || _mode === constants.Z_SYNC_FLUSH))) {

            if (this.options.to === 'string') {

              next_out_utf8 = strings.utf8border(strm.output, strm.next_out);

              tail = strm.next_out - next_out_utf8;
              utf8str = strings.buf2string(strm.output, next_out_utf8);

              // move tail
              strm.next_out = tail;
              strm.avail_out = chunkSize - tail;
              if (tail) { common.arraySet(strm.output, strm.output, next_out_utf8, tail, 0); }

              this.onData(utf8str);

            } else {
              this.onData(common.shrinkBuf(strm.output, strm.next_out));
            }
          }
        }

        // When no more input data, we should check that internal inflate buffers
        // are flushed. The only way to do it when avail_out = 0 - run one more
        // inflate pass. But if output data not exists, inflate return Z_BUF_ERROR.
        // Here we set flag to process this error properly.
        //
        // NOTE. Deflate does not return error in this case and does not needs such
        // logic.
        if (strm.avail_in === 0 && strm.avail_out === 0) {
          allowBufError = true;
        }

      } while ((strm.avail_in > 0 || strm.avail_out === 0) && status !== constants.Z_STREAM_END);

      if (status === constants.Z_STREAM_END) {
        _mode = constants.Z_FINISH;
      }

      // Finalize on the last chunk.
      if (_mode === constants.Z_FINISH) {
        status = inflate_1.inflateEnd(this.strm);
        this.onEnd(status);
        this.ended = true;
        return status === constants.Z_OK;
      }

      // callback interim results if Z_SYNC_FLUSH.
      if (_mode === constants.Z_SYNC_FLUSH) {
        this.onEnd(constants.Z_OK);
        strm.avail_out = 0;
        return true;
      }

      return true;
    };


    /**
     * Inflate#onData(chunk) -> Void
     * - chunk (Uint8Array|Array|String): output data. Type of array depends
     *   on js engine support. When string output requested, each chunk
     *   will be string.
     *
     * By default, stores data blocks in `chunks[]` property and glue
     * those in `onEnd`. Override this handler, if you need another behaviour.
     **/
    Inflate.prototype.onData = function (chunk) {
      this.chunks.push(chunk);
    };


    /**
     * Inflate#onEnd(status) -> Void
     * - status (Number): inflate status. 0 (Z_OK) on success,
     *   other if not.
     *
     * Called either after you tell inflate that the input stream is
     * complete (Z_FINISH) or should be flushed (Z_SYNC_FLUSH)
     * or if an error happened. By default - join collected chunks,
     * free memory and fill `results` / `err` properties.
     **/
    Inflate.prototype.onEnd = function (status) {
      // On success - join
      if (status === constants.Z_OK) {
        if (this.options.to === 'string') {
          // Glue & convert here, until we teach pako to send
          // utf8 aligned strings to onData
          this.result = this.chunks.join('');
        } else {
          this.result = common.flattenChunks(this.chunks);
        }
      }
      this.chunks = [];
      this.err = status;
      this.msg = this.strm.msg;
    };


    /**
     * inflate(data[, options]) -> Uint8Array|Array|String
     * - data (Uint8Array|Array|String): input data to decompress.
     * - options (Object): zlib inflate options.
     *
     * Decompress `data` with inflate/ungzip and `options`. Autodetect
     * format via wrapper header by default. That's why we don't provide
     * separate `ungzip` method.
     *
     * Supported options are:
     *
     * - windowBits
     *
     * [http://zlib.net/manual.html#Advanced](http://zlib.net/manual.html#Advanced)
     * for more information.
     *
     * Sugar (options):
     *
     * - `raw` (Boolean) - say that we work with raw stream, if you don't wish to specify
     *   negative windowBits implicitly.
     * - `to` (String) - if equal to 'string', then result will be converted
     *   from utf8 to utf16 (javascript) string. When string output requested,
     *   chunk length can differ from `chunkSize`, depending on content.
     *
     *
     * ##### Example:
     *
     * ```javascript
     * var pako = require('pako')
     *   , input = pako.deflate([1,2,3,4,5,6,7,8,9])
     *   , output;
     *
     * try {
     *   output = pako.inflate(input);
     * } catch (err)
     *   console.log(err);
     * }
     * ```
     **/
    function inflate$1(input, options) {
      var inflator = new Inflate(options);

      inflator.push(input, true);

      // That will never happens, if you don't cheat with options :)
      if (inflator.err) { throw inflator.msg || messages[inflator.err]; }

      return inflator.result;
    }


    /**
     * inflateRaw(data[, options]) -> Uint8Array|Array|String
     * - data (Uint8Array|Array|String): input data to decompress.
     * - options (Object): zlib inflate options.
     *
     * The same as [[inflate]], but creates raw data, without wrapper
     * (header and adler32 crc).
     **/
    function inflateRaw(input, options) {
      options = options || {};
      options.raw = true;
      return inflate$1(input, options);
    }


    /**
     * ungzip(data[, options]) -> Uint8Array|Array|String
     * - data (Uint8Array|Array|String): input data to decompress.
     * - options (Object): zlib inflate options.
     *
     * Just shortcut to [[inflate]], because it autodetects format
     * by header.content. Done for convenience.
     **/


    var Inflate_1 = Inflate;
    var inflate_2$1 = inflate$1;
    var inflateRaw_1 = inflateRaw;
    var ungzip  = inflate$1;

    var inflate_1$1 = {
    	Inflate: Inflate_1,
    	inflate: inflate_2$1,
    	inflateRaw: inflateRaw_1,
    	ungzip: ungzip
    };

    var assign    = common.assign;





    var pako = {};

    assign(pako, deflate_1$1, inflate_1$1, constants);

    var pako_1 = pako;

    var USE_TYPEDARRAY = (typeof Uint8Array !== 'undefined') && (typeof Uint16Array !== 'undefined') && (typeof Uint32Array !== 'undefined');





    var ARRAY_TYPE = USE_TYPEDARRAY ? "uint8array" : "array";

    var magic = "\x08\x00";

    /**
     * Create a worker that uses pako to inflate/deflate.
     * @constructor
     * @param {String} action the name of the pako function to call : either "Deflate" or "Inflate".
     * @param {Object} options the options to use when (de)compressing.
     */
    function FlateWorker(action, options) {
        GenericWorker_1.call(this, "FlateWorker/" + action);

        this._pako = null;
        this._pakoAction = action;
        this._pakoOptions = options;
        // the `meta` object from the last chunk received
        // this allow this worker to pass around metadata
        this.meta = {};
    }

    utils.inherits(FlateWorker, GenericWorker_1);

    /**
     * @see GenericWorker.processChunk
     */
    FlateWorker.prototype.processChunk = function (chunk) {
        this.meta = chunk.meta;
        if (this._pako === null) {
            this._createPako();
        }
        this._pako.push(utils.transformTo(ARRAY_TYPE, chunk.data), false);
    };

    /**
     * @see GenericWorker.flush
     */
    FlateWorker.prototype.flush = function () {
        GenericWorker_1.prototype.flush.call(this);
        if (this._pako === null) {
            this._createPako();
        }
        this._pako.push([], true);
    };
    /**
     * @see GenericWorker.cleanUp
     */
    FlateWorker.prototype.cleanUp = function () {
        GenericWorker_1.prototype.cleanUp.call(this);
        this._pako = null;
    };

    /**
     * Create the _pako object.
     * TODO: lazy-loading this object isn't the best solution but it's the
     * quickest. The best solution is to lazy-load the worker list. See also the
     * issue #446.
     */
    FlateWorker.prototype._createPako = function () {
        this._pako = new pako_1[this._pakoAction]({
            raw: true,
            level: this._pakoOptions.level || -1 // default compression
        });
        var self = this;
        this._pako.onData = function(data) {
            self.push({
                data : data,
                meta : self.meta
            });
        };
    };

    var compressWorker = function (compressionOptions) {
        return new FlateWorker("Deflate", compressionOptions);
    };
    var uncompressWorker = function () {
        return new FlateWorker("Inflate", {});
    };

    var flate = {
    	magic: magic,
    	compressWorker: compressWorker,
    	uncompressWorker: uncompressWorker
    };

    var STORE = {
        magic: "\x00\x00",
        compressWorker : function (compressionOptions) {
            return new GenericWorker_1("STORE compression");
        },
        uncompressWorker : function () {
            return new GenericWorker_1("STORE decompression");
        }
    };
    var DEFLATE = flate;

    var compressions = {
    	STORE: STORE,
    	DEFLATE: DEFLATE
    };

    var LOCAL_FILE_HEADER = "PK\x03\x04";
    var CENTRAL_FILE_HEADER = "PK\x01\x02";
    var CENTRAL_DIRECTORY_END = "PK\x05\x06";
    var ZIP64_CENTRAL_DIRECTORY_LOCATOR = "PK\x06\x07";
    var ZIP64_CENTRAL_DIRECTORY_END = "PK\x06\x06";
    var DATA_DESCRIPTOR = "PK\x07\x08";

    var signature = {
    	LOCAL_FILE_HEADER: LOCAL_FILE_HEADER,
    	CENTRAL_FILE_HEADER: CENTRAL_FILE_HEADER,
    	CENTRAL_DIRECTORY_END: CENTRAL_DIRECTORY_END,
    	ZIP64_CENTRAL_DIRECTORY_LOCATOR: ZIP64_CENTRAL_DIRECTORY_LOCATOR,
    	ZIP64_CENTRAL_DIRECTORY_END: ZIP64_CENTRAL_DIRECTORY_END,
    	DATA_DESCRIPTOR: DATA_DESCRIPTOR
    };

    /**
     * Transform an integer into a string in hexadecimal.
     * @private
     * @param {number} dec the number to convert.
     * @param {number} bytes the number of bytes to generate.
     * @returns {string} the result.
     */
    var decToHex = function(dec, bytes) {
        var hex = "", i;
        for (i = 0; i < bytes; i++) {
            hex += String.fromCharCode(dec & 0xff);
            dec = dec >>> 8;
        }
        return hex;
    };

    /**
     * Generate the UNIX part of the external file attributes.
     * @param {Object} unixPermissions the unix permissions or null.
     * @param {Boolean} isDir true if the entry is a directory, false otherwise.
     * @return {Number} a 32 bit integer.
     *
     * adapted from http://unix.stackexchange.com/questions/14705/the-zip-formats-external-file-attribute :
     *
     * TTTTsstrwxrwxrwx0000000000ADVSHR
     * ^^^^____________________________ file type, see zipinfo.c (UNX_*)
     *     ^^^_________________________ setuid, setgid, sticky
     *        ^^^^^^^^^________________ permissions
     *                 ^^^^^^^^^^______ not used ?
     *                           ^^^^^^ DOS attribute bits : Archive, Directory, Volume label, System file, Hidden, Read only
     */
    var generateUnixExternalFileAttr = function (unixPermissions, isDir) {

        var result = unixPermissions;
        if (!unixPermissions) {
            // I can't use octal values in strict mode, hence the hexa.
            //  040775 => 0x41fd
            // 0100664 => 0x81b4
            result = isDir ? 0x41fd : 0x81b4;
        }
        return (result & 0xFFFF) << 16;
    };

    /**
     * Generate the DOS part of the external file attributes.
     * @param {Object} dosPermissions the dos permissions or null.
     * @param {Boolean} isDir true if the entry is a directory, false otherwise.
     * @return {Number} a 32 bit integer.
     *
     * Bit 0     Read-Only
     * Bit 1     Hidden
     * Bit 2     System
     * Bit 3     Volume Label
     * Bit 4     Directory
     * Bit 5     Archive
     */
    var generateDosExternalFileAttr = function (dosPermissions, isDir) {

        // the dir flag is already set for compatibility
        return (dosPermissions || 0)  & 0x3F;
    };

    /**
     * Generate the various parts used in the construction of the final zip file.
     * @param {Object} streamInfo the hash with information about the compressed file.
     * @param {Boolean} streamedContent is the content streamed ?
     * @param {Boolean} streamingEnded is the stream finished ?
     * @param {number} offset the current offset from the start of the zip file.
     * @param {String} platform let's pretend we are this platform (change platform dependents fields)
     * @param {Function} encodeFileName the function to encode the file name / comment.
     * @return {Object} the zip parts.
     */
    var generateZipParts = function(streamInfo, streamedContent, streamingEnded, offset, platform, encodeFileName) {
        var file = streamInfo['file'],
        compression = streamInfo['compression'],
        useCustomEncoding = encodeFileName !== utf8.utf8encode,
        encodedFileName = utils.transformTo("string", encodeFileName(file.name)),
        utfEncodedFileName = utils.transformTo("string", utf8.utf8encode(file.name)),
        comment = file.comment,
        encodedComment = utils.transformTo("string", encodeFileName(comment)),
        utfEncodedComment = utils.transformTo("string", utf8.utf8encode(comment)),
        useUTF8ForFileName = utfEncodedFileName.length !== file.name.length,
        useUTF8ForComment = utfEncodedComment.length !== comment.length,
        dosTime,
        dosDate,
        extraFields = "",
        unicodePathExtraField = "",
        unicodeCommentExtraField = "",
        dir = file.dir,
        date = file.date;


        var dataInfo = {
            crc32 : 0,
            compressedSize : 0,
            uncompressedSize : 0
        };

        // if the content is streamed, the sizes/crc32 are only available AFTER
        // the end of the stream.
        if (!streamedContent || streamingEnded) {
            dataInfo.crc32 = streamInfo['crc32'];
            dataInfo.compressedSize = streamInfo['compressedSize'];
            dataInfo.uncompressedSize = streamInfo['uncompressedSize'];
        }

        var bitflag = 0;
        if (streamedContent) {
            // Bit 3: the sizes/crc32 are set to zero in the local header.
            // The correct values are put in the data descriptor immediately
            // following the compressed data.
            bitflag |= 0x0008;
        }
        if (!useCustomEncoding && (useUTF8ForFileName || useUTF8ForComment)) {
            // Bit 11: Language encoding flag (EFS).
            bitflag |= 0x0800;
        }


        var extFileAttr = 0;
        var versionMadeBy = 0;
        if (dir) {
            // dos or unix, we set the dos dir flag
            extFileAttr |= 0x00010;
        }
        if(platform === "UNIX") {
            versionMadeBy = 0x031E; // UNIX, version 3.0
            extFileAttr |= generateUnixExternalFileAttr(file.unixPermissions, dir);
        } else { // DOS or other, fallback to DOS
            versionMadeBy = 0x0014; // DOS, version 2.0
            extFileAttr |= generateDosExternalFileAttr(file.dosPermissions);
        }

        // date
        // @see http://www.delorie.com/djgpp/doc/rbinter/it/52/13.html
        // @see http://www.delorie.com/djgpp/doc/rbinter/it/65/16.html
        // @see http://www.delorie.com/djgpp/doc/rbinter/it/66/16.html

        dosTime = date.getUTCHours();
        dosTime = dosTime << 6;
        dosTime = dosTime | date.getUTCMinutes();
        dosTime = dosTime << 5;
        dosTime = dosTime | date.getUTCSeconds() / 2;

        dosDate = date.getUTCFullYear() - 1980;
        dosDate = dosDate << 4;
        dosDate = dosDate | (date.getUTCMonth() + 1);
        dosDate = dosDate << 5;
        dosDate = dosDate | date.getUTCDate();

        if (useUTF8ForFileName) {
            // set the unicode path extra field. unzip needs at least one extra
            // field to correctly handle unicode path, so using the path is as good
            // as any other information. This could improve the situation with
            // other archive managers too.
            // This field is usually used without the utf8 flag, with a non
            // unicode path in the header (winrar, winzip). This helps (a bit)
            // with the messy Windows' default compressed folders feature but
            // breaks on p7zip which doesn't seek the unicode path extra field.
            // So for now, UTF-8 everywhere !
            unicodePathExtraField =
                // Version
                decToHex(1, 1) +
                // NameCRC32
                decToHex(crc32_1(encodedFileName), 4) +
                // UnicodeName
                utfEncodedFileName;

            extraFields +=
                // Info-ZIP Unicode Path Extra Field
                "\x75\x70" +
                // size
                decToHex(unicodePathExtraField.length, 2) +
                // content
                unicodePathExtraField;
        }

        if(useUTF8ForComment) {

            unicodeCommentExtraField =
                // Version
                decToHex(1, 1) +
                // CommentCRC32
                decToHex(crc32_1(encodedComment), 4) +
                // UnicodeName
                utfEncodedComment;

            extraFields +=
                // Info-ZIP Unicode Path Extra Field
                "\x75\x63" +
                // size
                decToHex(unicodeCommentExtraField.length, 2) +
                // content
                unicodeCommentExtraField;
        }

        var header = "";

        // version needed to extract
        header += "\x0A\x00";
        // general purpose bit flag
        header += decToHex(bitflag, 2);
        // compression method
        header += compression.magic;
        // last mod file time
        header += decToHex(dosTime, 2);
        // last mod file date
        header += decToHex(dosDate, 2);
        // crc-32
        header += decToHex(dataInfo.crc32, 4);
        // compressed size
        header += decToHex(dataInfo.compressedSize, 4);
        // uncompressed size
        header += decToHex(dataInfo.uncompressedSize, 4);
        // file name length
        header += decToHex(encodedFileName.length, 2);
        // extra field length
        header += decToHex(extraFields.length, 2);


        var fileRecord = signature.LOCAL_FILE_HEADER + header + encodedFileName + extraFields;

        var dirRecord = signature.CENTRAL_FILE_HEADER +
            // version made by (00: DOS)
            decToHex(versionMadeBy, 2) +
            // file header (common to file and central directory)
            header +
            // file comment length
            decToHex(encodedComment.length, 2) +
            // disk number start
            "\x00\x00" +
            // internal file attributes TODO
            "\x00\x00" +
            // external file attributes
            decToHex(extFileAttr, 4) +
            // relative offset of local header
            decToHex(offset, 4) +
            // file name
            encodedFileName +
            // extra field
            extraFields +
            // file comment
            encodedComment;

        return {
            fileRecord: fileRecord,
            dirRecord: dirRecord
        };
    };

    /**
     * Generate the EOCD record.
     * @param {Number} entriesCount the number of entries in the zip file.
     * @param {Number} centralDirLength the length (in bytes) of the central dir.
     * @param {Number} localDirLength the length (in bytes) of the local dir.
     * @param {String} comment the zip file comment as a binary string.
     * @param {Function} encodeFileName the function to encode the comment.
     * @return {String} the EOCD record.
     */
    var generateCentralDirectoryEnd = function (entriesCount, centralDirLength, localDirLength, comment, encodeFileName) {
        var dirEnd = "";
        var encodedComment = utils.transformTo("string", encodeFileName(comment));

        // end of central dir signature
        dirEnd = signature.CENTRAL_DIRECTORY_END +
            // number of this disk
            "\x00\x00" +
            // number of the disk with the start of the central directory
            "\x00\x00" +
            // total number of entries in the central directory on this disk
            decToHex(entriesCount, 2) +
            // total number of entries in the central directory
            decToHex(entriesCount, 2) +
            // size of the central directory   4 bytes
            decToHex(centralDirLength, 4) +
            // offset of start of central directory with respect to the starting disk number
            decToHex(localDirLength, 4) +
            // .ZIP file comment length
            decToHex(encodedComment.length, 2) +
            // .ZIP file comment
            encodedComment;

        return dirEnd;
    };

    /**
     * Generate data descriptors for a file entry.
     * @param {Object} streamInfo the hash generated by a worker, containing information
     * on the file entry.
     * @return {String} the data descriptors.
     */
    var generateDataDescriptors = function (streamInfo) {
        var descriptor = "";
        descriptor = signature.DATA_DESCRIPTOR +
            // crc-32                          4 bytes
            decToHex(streamInfo['crc32'], 4) +
            // compressed size                 4 bytes
            decToHex(streamInfo['compressedSize'], 4) +
            // uncompressed size               4 bytes
            decToHex(streamInfo['uncompressedSize'], 4);

        return descriptor;
    };


    /**
     * A worker to concatenate other workers to create a zip file.
     * @param {Boolean} streamFiles `true` to stream the content of the files,
     * `false` to accumulate it.
     * @param {String} comment the comment to use.
     * @param {String} platform the platform to use, "UNIX" or "DOS".
     * @param {Function} encodeFileName the function to encode file names and comments.
     */
    function ZipFileWorker(streamFiles, comment, platform, encodeFileName) {
        GenericWorker_1.call(this, "ZipFileWorker");
        // The number of bytes written so far. This doesn't count accumulated chunks.
        this.bytesWritten = 0;
        // The comment of the zip file
        this.zipComment = comment;
        // The platform "generating" the zip file.
        this.zipPlatform = platform;
        // the function to encode file names and comments.
        this.encodeFileName = encodeFileName;
        // Should we stream the content of the files ?
        this.streamFiles = streamFiles;
        // If `streamFiles` is false, we will need to accumulate the content of the
        // files to calculate sizes / crc32 (and write them *before* the content).
        // This boolean indicates if we are accumulating chunks (it will change a lot
        // during the lifetime of this worker).
        this.accumulate = false;
        // The buffer receiving chunks when accumulating content.
        this.contentBuffer = [];
        // The list of generated directory records.
        this.dirRecords = [];
        // The offset (in bytes) from the beginning of the zip file for the current source.
        this.currentSourceOffset = 0;
        // The total number of entries in this zip file.
        this.entriesCount = 0;
        // the name of the file currently being added, null when handling the end of the zip file.
        // Used for the emitted metadata.
        this.currentFile = null;



        this._sources = [];
    }
    utils.inherits(ZipFileWorker, GenericWorker_1);

    /**
     * @see GenericWorker.push
     */
    ZipFileWorker.prototype.push = function (chunk) {

        var currentFilePercent = chunk.meta.percent || 0;
        var entriesCount = this.entriesCount;
        var remainingFiles = this._sources.length;

        if(this.accumulate) {
            this.contentBuffer.push(chunk);
        } else {
            this.bytesWritten += chunk.data.length;

            GenericWorker_1.prototype.push.call(this, {
                data : chunk.data,
                meta : {
                    currentFile : this.currentFile,
                    percent : entriesCount ? (currentFilePercent + 100 * (entriesCount - remainingFiles - 1)) / entriesCount : 100
                }
            });
        }
    };

    /**
     * The worker started a new source (an other worker).
     * @param {Object} streamInfo the streamInfo object from the new source.
     */
    ZipFileWorker.prototype.openedSource = function (streamInfo) {
        this.currentSourceOffset = this.bytesWritten;
        this.currentFile = streamInfo['file'].name;

        var streamedContent = this.streamFiles && !streamInfo['file'].dir;

        // don't stream folders (because they don't have any content)
        if(streamedContent) {
            var record = generateZipParts(streamInfo, streamedContent, false, this.currentSourceOffset, this.zipPlatform, this.encodeFileName);
            this.push({
                data : record.fileRecord,
                meta : {percent:0}
            });
        } else {
            // we need to wait for the whole file before pushing anything
            this.accumulate = true;
        }
    };

    /**
     * The worker finished a source (an other worker).
     * @param {Object} streamInfo the streamInfo object from the finished source.
     */
    ZipFileWorker.prototype.closedSource = function (streamInfo) {
        this.accumulate = false;
        var streamedContent = this.streamFiles && !streamInfo['file'].dir;
        var record = generateZipParts(streamInfo, streamedContent, true, this.currentSourceOffset, this.zipPlatform, this.encodeFileName);

        this.dirRecords.push(record.dirRecord);
        if(streamedContent) {
            // after the streamed file, we put data descriptors
            this.push({
                data : generateDataDescriptors(streamInfo),
                meta : {percent:100}
            });
        } else {
            // the content wasn't streamed, we need to push everything now
            // first the file record, then the content
            this.push({
                data : record.fileRecord,
                meta : {percent:0}
            });
            while(this.contentBuffer.length) {
                this.push(this.contentBuffer.shift());
            }
        }
        this.currentFile = null;
    };

    /**
     * @see GenericWorker.flush
     */
    ZipFileWorker.prototype.flush = function () {

        var localDirLength = this.bytesWritten;
        for(var i = 0; i < this.dirRecords.length; i++) {
            this.push({
                data : this.dirRecords[i],
                meta : {percent:100}
            });
        }
        var centralDirLength = this.bytesWritten - localDirLength;

        var dirEnd = generateCentralDirectoryEnd(this.dirRecords.length, centralDirLength, localDirLength, this.zipComment, this.encodeFileName);

        this.push({
            data : dirEnd,
            meta : {percent:100}
        });
    };

    /**
     * Prepare the next source to be read.
     */
    ZipFileWorker.prototype.prepareNextSource = function () {
        this.previous = this._sources.shift();
        this.openedSource(this.previous.streamInfo);
        if (this.isPaused) {
            this.previous.pause();
        } else {
            this.previous.resume();
        }
    };

    /**
     * @see GenericWorker.registerPrevious
     */
    ZipFileWorker.prototype.registerPrevious = function (previous) {
        this._sources.push(previous);
        var self = this;

        previous.on('data', function (chunk) {
            self.processChunk(chunk);
        });
        previous.on('end', function () {
            self.closedSource(self.previous.streamInfo);
            if(self._sources.length) {
                self.prepareNextSource();
            } else {
                self.end();
            }
        });
        previous.on('error', function (e) {
            self.error(e);
        });
        return this;
    };

    /**
     * @see GenericWorker.resume
     */
    ZipFileWorker.prototype.resume = function () {
        if(!GenericWorker_1.prototype.resume.call(this)) {
            return false;
        }

        if (!this.previous && this._sources.length) {
            this.prepareNextSource();
            return true;
        }
        if (!this.previous && !this._sources.length && !this.generatedError) {
            this.end();
            return true;
        }
    };

    /**
     * @see GenericWorker.error
     */
    ZipFileWorker.prototype.error = function (e) {
        var sources = this._sources;
        if(!GenericWorker_1.prototype.error.call(this, e)) {
            return false;
        }
        for(var i = 0; i < sources.length; i++) {
            try {
                sources[i].error(e);
            } catch(e) {
                // the `error` exploded, nothing to do
            }
        }
        return true;
    };

    /**
     * @see GenericWorker.lock
     */
    ZipFileWorker.prototype.lock = function () {
        GenericWorker_1.prototype.lock.call(this);
        var sources = this._sources;
        for(var i = 0; i < sources.length; i++) {
            sources[i].lock();
        }
    };

    var ZipFileWorker_1 = ZipFileWorker;

    /**
     * Find the compression to use.
     * @param {String} fileCompression the compression defined at the file level, if any.
     * @param {String} zipCompression the compression defined at the load() level.
     * @return {Object} the compression object to use.
     */
    var getCompression = function (fileCompression, zipCompression) {

        var compressionName = fileCompression || zipCompression;
        var compression = compressions[compressionName];
        if (!compression) {
            throw new Error(compressionName + " is not a valid compression method !");
        }
        return compression;
    };

    /**
     * Create a worker to generate a zip file.
     * @param {JSZip} zip the JSZip instance at the right root level.
     * @param {Object} options to generate the zip file.
     * @param {String} comment the comment to use.
     */
    var generateWorker = function (zip, options, comment) {

        var zipFileWorker = new ZipFileWorker_1(options.streamFiles, comment, options.platform, options.encodeFileName);
        var entriesCount = 0;
        try {

            zip.forEach(function (relativePath, file) {
                entriesCount++;
                var compression = getCompression(file.options.compression, options.compression);
                var compressionOptions = file.options.compressionOptions || options.compressionOptions || {};
                var dir = file.dir, date = file.date;

                file._compressWorker(compression, compressionOptions)
                .withStreamInfo("file", {
                    name : relativePath,
                    dir : dir,
                    date : date,
                    comment : file.comment || "",
                    unixPermissions : file.unixPermissions,
                    dosPermissions : file.dosPermissions
                })
                .pipe(zipFileWorker);
            });
            zipFileWorker.entriesCount = entriesCount;
        } catch (e) {
            zipFileWorker.error(e);
        }

        return zipFileWorker;
    };

    var generate = {
    	generateWorker: generateWorker
    };

    /**
     * A worker that use a nodejs stream as source.
     * @constructor
     * @param {String} filename the name of the file entry for this stream.
     * @param {Readable} stream the nodejs stream.
     */
    function NodejsStreamInputAdapter(filename, stream) {
        GenericWorker_1.call(this, "Nodejs stream input adapter for " + filename);
        this._upstreamEnded = false;
        this._bindStream(stream);
    }

    utils.inherits(NodejsStreamInputAdapter, GenericWorker_1);

    /**
     * Prepare the stream and bind the callbacks on it.
     * Do this ASAP on node 0.10 ! A lazy binding doesn't always work.
     * @param {Stream} stream the nodejs stream to use.
     */
    NodejsStreamInputAdapter.prototype._bindStream = function (stream) {
        var self = this;
        this._stream = stream;
        stream.pause();
        stream
        .on("data", function (chunk) {
            self.push({
                data: chunk,
                meta : {
                    percent : 0
                }
            });
        })
        .on("error", function (e) {
            if(self.isPaused) {
                this.generatedError = e;
            } else {
                self.error(e);
            }
        })
        .on("end", function () {
            if(self.isPaused) {
                self._upstreamEnded = true;
            } else {
                self.end();
            }
        });
    };
    NodejsStreamInputAdapter.prototype.pause = function () {
        if(!GenericWorker_1.prototype.pause.call(this)) {
            return false;
        }
        this._stream.pause();
        return true;
    };
    NodejsStreamInputAdapter.prototype.resume = function () {
        if(!GenericWorker_1.prototype.resume.call(this)) {
            return false;
        }

        if(this._upstreamEnded) {
            this.end();
        } else {
            this._stream.resume();
        }

        return true;
    };

    var NodejsStreamInputAdapter_1 = NodejsStreamInputAdapter;

    /**
     * Add a file in the current folder.
     * @private
     * @param {string} name the name of the file
     * @param {String|ArrayBuffer|Uint8Array|Buffer} data the data of the file
     * @param {Object} originalOptions the options of the file
     * @return {Object} the new file.
     */
    var fileAdd = function(name, data, originalOptions) {
        // be sure sub folders exist
        var dataType = utils.getTypeOf(data),
            parent;


        /*
         * Correct options.
         */

        var o = utils.extend(originalOptions || {}, defaults);
        o.date = o.date || new Date();
        if (o.compression !== null) {
            o.compression = o.compression.toUpperCase();
        }

        if (typeof o.unixPermissions === "string") {
            o.unixPermissions = parseInt(o.unixPermissions, 8);
        }

        // UNX_IFDIR  0040000 see zipinfo.c
        if (o.unixPermissions && (o.unixPermissions & 0x4000)) {
            o.dir = true;
        }
        // Bit 4    Directory
        if (o.dosPermissions && (o.dosPermissions & 0x0010)) {
            o.dir = true;
        }

        if (o.dir) {
            name = forceTrailingSlash(name);
        }
        if (o.createFolders && (parent = parentFolder(name))) {
            folderAdd.call(this, parent, true);
        }

        var isUnicodeString = dataType === "string" && o.binary === false && o.base64 === false;
        if (!originalOptions || typeof originalOptions.binary === "undefined") {
            o.binary = !isUnicodeString;
        }


        var isCompressedEmpty = (data instanceof compressedObject) && data.uncompressedSize === 0;

        if (isCompressedEmpty || o.dir || !data || data.length === 0) {
            o.base64 = false;
            o.binary = true;
            data = "";
            o.compression = "STORE";
            dataType = "string";
        }

        /*
         * Convert content to fit.
         */

        var zipObjectContent = null;
        if (data instanceof compressedObject || data instanceof GenericWorker_1) {
            zipObjectContent = data;
        } else if (nodejsUtils.isNode && nodejsUtils.isStream(data)) {
            zipObjectContent = new NodejsStreamInputAdapter_1(name, data);
        } else {
            zipObjectContent = utils.prepareContent(name, data, o.binary, o.optimizedBinaryString, o.base64);
        }

        var object = new zipObject(name, zipObjectContent, o);
        this.files[name] = object;
        /*
        TODO: we can't throw an exception because we have async promises
        (we can have a promise of a Date() for example) but returning a
        promise is useless because file(name, data) returns the JSZip
        object for chaining. Should we break that to allow the user
        to catch the error ?

        return external.Promise.resolve(zipObjectContent)
        .then(function () {
            return object;
        });
        */
    };

    /**
     * Find the parent folder of the path.
     * @private
     * @param {string} path the path to use
     * @return {string} the parent folder, or ""
     */
    var parentFolder = function (path) {
        if (path.slice(-1) === '/') {
            path = path.substring(0, path.length - 1);
        }
        var lastSlash = path.lastIndexOf('/');
        return (lastSlash > 0) ? path.substring(0, lastSlash) : "";
    };

    /**
     * Returns the path with a slash at the end.
     * @private
     * @param {String} path the path to check.
     * @return {String} the path with a trailing slash.
     */
    var forceTrailingSlash = function(path) {
        // Check the name ends with a /
        if (path.slice(-1) !== "/") {
            path += "/"; // IE doesn't like substr(-1)
        }
        return path;
    };

    /**
     * Add a (sub) folder in the current folder.
     * @private
     * @param {string} name the folder's name
     * @param {boolean=} [createFolders] If true, automatically create sub
     *  folders. Defaults to false.
     * @return {Object} the new folder.
     */
    var folderAdd = function(name, createFolders) {
        createFolders = (typeof createFolders !== 'undefined') ? createFolders : defaults.createFolders;

        name = forceTrailingSlash(name);

        // Does this folder already exist?
        if (!this.files[name]) {
            fileAdd.call(this, name, null, {
                dir: true,
                createFolders: createFolders
            });
        }
        return this.files[name];
    };

    /**
    * Cross-window, cross-Node-context regular expression detection
    * @param  {Object}  object Anything
    * @return {Boolean}        true if the object is a regular expression,
    * false otherwise
    */
    function isRegExp$1(object) {
        return Object.prototype.toString.call(object) === "[object RegExp]";
    }

    // return the actual prototype of JSZip
    var out = {
        /**
         * @see loadAsync
         */
        load: function() {
            throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
        },


        /**
         * Call a callback function for each entry at this folder level.
         * @param {Function} cb the callback function:
         * function (relativePath, file) {...}
         * It takes 2 arguments : the relative path and the file.
         */
        forEach: function(cb) {
            var filename, relativePath, file;
            for (filename in this.files) {
                if (!this.files.hasOwnProperty(filename)) {
                    continue;
                }
                file = this.files[filename];
                relativePath = filename.slice(this.root.length, filename.length);
                if (relativePath && filename.slice(0, this.root.length) === this.root) { // the file is in the current root
                    cb(relativePath, file); // TODO reverse the parameters ? need to be clean AND consistent with the filter search fn...
                }
            }
        },

        /**
         * Filter nested files/folders with the specified function.
         * @param {Function} search the predicate to use :
         * function (relativePath, file) {...}
         * It takes 2 arguments : the relative path and the file.
         * @return {Array} An array of matching elements.
         */
        filter: function(search) {
            var result = [];
            this.forEach(function (relativePath, entry) {
                if (search(relativePath, entry)) { // the file matches the function
                    result.push(entry);
                }

            });
            return result;
        },

        /**
         * Add a file to the zip file, or search a file.
         * @param   {string|RegExp} name The name of the file to add (if data is defined),
         * the name of the file to find (if no data) or a regex to match files.
         * @param   {String|ArrayBuffer|Uint8Array|Buffer} data  The file data, either raw or base64 encoded
         * @param   {Object} o     File options
         * @return  {JSZip|Object|Array} this JSZip object (when adding a file),
         * a file (when searching by string) or an array of files (when searching by regex).
         */
        file: function(name, data, o) {
            if (arguments.length === 1) {
                if (isRegExp$1(name)) {
                    var regexp = name;
                    return this.filter(function(relativePath, file) {
                        return !file.dir && regexp.test(relativePath);
                    });
                }
                else { // text
                    var obj = this.files[this.root + name];
                    if (obj && !obj.dir) {
                        return obj;
                    } else {
                        return null;
                    }
                }
            }
            else { // more than one argument : we have data !
                name = this.root + name;
                fileAdd.call(this, name, data, o);
            }
            return this;
        },

        /**
         * Add a directory to the zip file, or search.
         * @param   {String|RegExp} arg The name of the directory to add, or a regex to search folders.
         * @return  {JSZip} an object with the new directory as the root, or an array containing matching folders.
         */
        folder: function(arg) {
            if (!arg) {
                return this;
            }

            if (isRegExp$1(arg)) {
                return this.filter(function(relativePath, file) {
                    return file.dir && arg.test(relativePath);
                });
            }

            // else, name is a new folder
            var name = this.root + arg;
            var newFolder = folderAdd.call(this, name);

            // Allow chaining by returning a new object with this folder as the root
            var ret = this.clone();
            ret.root = newFolder.name;
            return ret;
        },

        /**
         * Delete a file, or a directory and all sub-files, from the zip
         * @param {string} name the name of the file to delete
         * @return {JSZip} this JSZip object
         */
        remove: function(name) {
            name = this.root + name;
            var file = this.files[name];
            if (!file) {
                // Look for any folders
                if (name.slice(-1) !== "/") {
                    name += "/";
                }
                file = this.files[name];
            }

            if (file && !file.dir) {
                // file
                delete this.files[name];
            } else {
                // maybe a folder, delete recursively
                var kids = this.filter(function(relativePath, file) {
                    return file.name.slice(0, name.length) === name;
                });
                for (var i = 0; i < kids.length; i++) {
                    delete this.files[kids[i].name];
                }
            }

            return this;
        },

        /**
         * Generate the complete zip file
         * @param {Object} options the options to generate the zip file :
         * - compression, "STORE" by default.
         * - type, "base64" by default. Values are : string, base64, uint8array, arraybuffer, blob.
         * @return {String|Uint8Array|ArrayBuffer|Buffer|Blob} the zip file
         */
        generate: function(options) {
            throw new Error("This method has been removed in JSZip 3.0, please check the upgrade guide.");
        },

        /**
         * Generate the complete zip file as an internal stream.
         * @param {Object} options the options to generate the zip file :
         * - compression, "STORE" by default.
         * - type, "base64" by default. Values are : string, base64, uint8array, arraybuffer, blob.
         * @return {StreamHelper} the streamed zip file.
         */
        generateInternalStream: function(options) {
          var worker, opts = {};
          try {
              opts = utils.extend(options || {}, {
                  streamFiles: false,
                  compression: "STORE",
                  compressionOptions : null,
                  type: "",
                  platform: "DOS",
                  comment: null,
                  mimeType: 'application/zip',
                  encodeFileName: utf8.utf8encode
              });

              opts.type = opts.type.toLowerCase();
              opts.compression = opts.compression.toUpperCase();

              // "binarystring" is preferred but the internals use "string".
              if(opts.type === "binarystring") {
                opts.type = "string";
              }

              if (!opts.type) {
                throw new Error("No output type specified.");
              }

              utils.checkSupport(opts.type);

              // accept nodejs `process.platform`
              if(
                  opts.platform === 'darwin' ||
                  opts.platform === 'freebsd' ||
                  opts.platform === 'linux' ||
                  opts.platform === 'sunos'
              ) {
                  opts.platform = "UNIX";
              }
              if (opts.platform === 'win32') {
                  opts.platform = "DOS";
              }

              var comment = opts.comment || this.comment || "";
              worker = generate.generateWorker(this, opts, comment);
          } catch (e) {
            worker = new GenericWorker_1("error");
            worker.error(e);
          }
          return new StreamHelper_1(worker, opts.type || "string", opts.mimeType);
        },
        /**
         * Generate the complete zip file asynchronously.
         * @see generateInternalStream
         */
        generateAsync: function(options, onUpdate) {
            return this.generateInternalStream(options).accumulate(onUpdate);
        },
        /**
         * Generate the complete zip file asynchronously.
         * @see generateInternalStream
         */
        generateNodeStream: function(options, onUpdate) {
            options = options || {};
            if (!options.type) {
                options.type = "nodebuffer";
            }
            return this.generateInternalStream(options).toNodejsStream(onUpdate);
        }
    };
    var object = out;

    function DataReader(data) {
        this.data = data; // type : see implementation
        this.length = data.length;
        this.index = 0;
        this.zero = 0;
    }
    DataReader.prototype = {
        /**
         * Check that the offset will not go too far.
         * @param {string} offset the additional offset to check.
         * @throws {Error} an Error if the offset is out of bounds.
         */
        checkOffset: function(offset) {
            this.checkIndex(this.index + offset);
        },
        /**
         * Check that the specified index will not be too far.
         * @param {string} newIndex the index to check.
         * @throws {Error} an Error if the index is out of bounds.
         */
        checkIndex: function(newIndex) {
            if (this.length < this.zero + newIndex || newIndex < 0) {
                throw new Error("End of data reached (data length = " + this.length + ", asked index = " + (newIndex) + "). Corrupted zip ?");
            }
        },
        /**
         * Change the index.
         * @param {number} newIndex The new index.
         * @throws {Error} if the new index is out of the data.
         */
        setIndex: function(newIndex) {
            this.checkIndex(newIndex);
            this.index = newIndex;
        },
        /**
         * Skip the next n bytes.
         * @param {number} n the number of bytes to skip.
         * @throws {Error} if the new index is out of the data.
         */
        skip: function(n) {
            this.setIndex(this.index + n);
        },
        /**
         * Get the byte at the specified index.
         * @param {number} i the index to use.
         * @return {number} a byte.
         */
        byteAt: function(i) {
            // see implementations
        },
        /**
         * Get the next number with a given byte size.
         * @param {number} size the number of bytes to read.
         * @return {number} the corresponding number.
         */
        readInt: function(size) {
            var result = 0,
                i;
            this.checkOffset(size);
            for (i = this.index + size - 1; i >= this.index; i--) {
                result = (result << 8) + this.byteAt(i);
            }
            this.index += size;
            return result;
        },
        /**
         * Get the next string with a given byte size.
         * @param {number} size the number of bytes to read.
         * @return {string} the corresponding string.
         */
        readString: function(size) {
            return utils.transformTo("string", this.readData(size));
        },
        /**
         * Get raw data without conversion, <size> bytes.
         * @param {number} size the number of bytes to read.
         * @return {Object} the raw data, implementation specific.
         */
        readData: function(size) {
            // see implementations
        },
        /**
         * Find the last occurrence of a zip signature (4 bytes).
         * @param {string} sig the signature to find.
         * @return {number} the index of the last occurrence, -1 if not found.
         */
        lastIndexOfSignature: function(sig) {
            // see implementations
        },
        /**
         * Read the signature (4 bytes) at the current position and compare it with sig.
         * @param {string} sig the expected signature
         * @return {boolean} true if the signature matches, false otherwise.
         */
        readAndCheckSignature: function(sig) {
            // see implementations
        },
        /**
         * Get the next date.
         * @return {Date} the date.
         */
        readDate: function() {
            var dostime = this.readInt(4);
            return new Date(Date.UTC(
            ((dostime >> 25) & 0x7f) + 1980, // year
            ((dostime >> 21) & 0x0f) - 1, // month
            (dostime >> 16) & 0x1f, // day
            (dostime >> 11) & 0x1f, // hour
            (dostime >> 5) & 0x3f, // minute
            (dostime & 0x1f) << 1)); // second
        }
    };
    var DataReader_1 = DataReader;

    function ArrayReader(data) {
        DataReader_1.call(this, data);
    	for(var i = 0; i < this.data.length; i++) {
    		data[i] = data[i] & 0xFF;
    	}
    }
    utils.inherits(ArrayReader, DataReader_1);
    /**
     * @see DataReader.byteAt
     */
    ArrayReader.prototype.byteAt = function(i) {
        return this.data[this.zero + i];
    };
    /**
     * @see DataReader.lastIndexOfSignature
     */
    ArrayReader.prototype.lastIndexOfSignature = function(sig) {
        var sig0 = sig.charCodeAt(0),
            sig1 = sig.charCodeAt(1),
            sig2 = sig.charCodeAt(2),
            sig3 = sig.charCodeAt(3);
        for (var i = this.length - 4; i >= 0; --i) {
            if (this.data[i] === sig0 && this.data[i + 1] === sig1 && this.data[i + 2] === sig2 && this.data[i + 3] === sig3) {
                return i - this.zero;
            }
        }

        return -1;
    };
    /**
     * @see DataReader.readAndCheckSignature
     */
    ArrayReader.prototype.readAndCheckSignature = function (sig) {
        var sig0 = sig.charCodeAt(0),
            sig1 = sig.charCodeAt(1),
            sig2 = sig.charCodeAt(2),
            sig3 = sig.charCodeAt(3),
            data = this.readData(4);
        return sig0 === data[0] && sig1 === data[1] && sig2 === data[2] && sig3 === data[3];
    };
    /**
     * @see DataReader.readData
     */
    ArrayReader.prototype.readData = function(size) {
        this.checkOffset(size);
        if(size === 0) {
            return [];
        }
        var result = this.data.slice(this.zero + this.index, this.zero + this.index + size);
        this.index += size;
        return result;
    };
    var ArrayReader_1 = ArrayReader;

    function StringReader(data) {
        DataReader_1.call(this, data);
    }
    utils.inherits(StringReader, DataReader_1);
    /**
     * @see DataReader.byteAt
     */
    StringReader.prototype.byteAt = function(i) {
        return this.data.charCodeAt(this.zero + i);
    };
    /**
     * @see DataReader.lastIndexOfSignature
     */
    StringReader.prototype.lastIndexOfSignature = function(sig) {
        return this.data.lastIndexOf(sig) - this.zero;
    };
    /**
     * @see DataReader.readAndCheckSignature
     */
    StringReader.prototype.readAndCheckSignature = function (sig) {
        var data = this.readData(4);
        return sig === data;
    };
    /**
     * @see DataReader.readData
     */
    StringReader.prototype.readData = function(size) {
        this.checkOffset(size);
        // this will work because the constructor applied the "& 0xff" mask.
        var result = this.data.slice(this.zero + this.index, this.zero + this.index + size);
        this.index += size;
        return result;
    };
    var StringReader_1 = StringReader;

    function Uint8ArrayReader(data) {
        ArrayReader_1.call(this, data);
    }
    utils.inherits(Uint8ArrayReader, ArrayReader_1);
    /**
     * @see DataReader.readData
     */
    Uint8ArrayReader.prototype.readData = function(size) {
        this.checkOffset(size);
        if(size === 0) {
            // in IE10, when using subarray(idx, idx), we get the array [0x00] instead of [].
            return new Uint8Array(0);
        }
        var result = this.data.subarray(this.zero + this.index, this.zero + this.index + size);
        this.index += size;
        return result;
    };
    var Uint8ArrayReader_1 = Uint8ArrayReader;

    function NodeBufferReader(data) {
        Uint8ArrayReader_1.call(this, data);
    }
    utils.inherits(NodeBufferReader, Uint8ArrayReader_1);

    /**
     * @see DataReader.readData
     */
    NodeBufferReader.prototype.readData = function(size) {
        this.checkOffset(size);
        var result = this.data.slice(this.zero + this.index, this.zero + this.index + size);
        this.index += size;
        return result;
    };
    var NodeBufferReader_1 = NodeBufferReader;

    /**
     * Create a reader adapted to the data.
     * @param {String|ArrayBuffer|Uint8Array|Buffer} data the data to read.
     * @return {DataReader} the data reader.
     */
    var readerFor = function (data) {
        var type = utils.getTypeOf(data);
        utils.checkSupport(type);
        if (type === "string" && !support.uint8array) {
            return new StringReader_1(data);
        }
        if (type === "nodebuffer") {
            return new NodeBufferReader_1(data);
        }
        if (support.uint8array) {
            return new Uint8ArrayReader_1(utils.transformTo("uint8array", data));
        }
        return new ArrayReader_1(utils.transformTo("array", data));
    };

    var MADE_BY_DOS = 0x00;
    var MADE_BY_UNIX = 0x03;

    /**
     * Find a compression registered in JSZip.
     * @param {string} compressionMethod the method magic to find.
     * @return {Object|null} the JSZip compression object, null if none found.
     */
    var findCompression = function(compressionMethod) {
        for (var method in compressions) {
            if (!compressions.hasOwnProperty(method)) {
                continue;
            }
            if (compressions[method].magic === compressionMethod) {
                return compressions[method];
            }
        }
        return null;
    };

    // class ZipEntry {{{
    /**
     * An entry in the zip file.
     * @constructor
     * @param {Object} options Options of the current file.
     * @param {Object} loadOptions Options for loading the stream.
     */
    function ZipEntry(options, loadOptions) {
        this.options = options;
        this.loadOptions = loadOptions;
    }
    ZipEntry.prototype = {
        /**
         * say if the file is encrypted.
         * @return {boolean} true if the file is encrypted, false otherwise.
         */
        isEncrypted: function() {
            // bit 1 is set
            return (this.bitFlag & 0x0001) === 0x0001;
        },
        /**
         * say if the file has utf-8 filename/comment.
         * @return {boolean} true if the filename/comment is in utf-8, false otherwise.
         */
        useUTF8: function() {
            // bit 11 is set
            return (this.bitFlag & 0x0800) === 0x0800;
        },
        /**
         * Read the local part of a zip file and add the info in this object.
         * @param {DataReader} reader the reader to use.
         */
        readLocalPart: function(reader) {
            var compression, localExtraFieldsLength;

            // we already know everything from the central dir !
            // If the central dir data are false, we are doomed.
            // On the bright side, the local part is scary  : zip64, data descriptors, both, etc.
            // The less data we get here, the more reliable this should be.
            // Let's skip the whole header and dash to the data !
            reader.skip(22);
            // in some zip created on windows, the filename stored in the central dir contains \ instead of /.
            // Strangely, the filename here is OK.
            // I would love to treat these zip files as corrupted (see http://www.info-zip.org/FAQ.html#backslashes
            // or APPNOTE#4.4.17.1, "All slashes MUST be forward slashes '/'") but there are a lot of bad zip generators...
            // Search "unzip mismatching "local" filename continuing with "central" filename version" on
            // the internet.
            //
            // I think I see the logic here : the central directory is used to display
            // content and the local directory is used to extract the files. Mixing / and \
            // may be used to display \ to windows users and use / when extracting the files.
            // Unfortunately, this lead also to some issues : http://seclists.org/fulldisclosure/2009/Sep/394
            this.fileNameLength = reader.readInt(2);
            localExtraFieldsLength = reader.readInt(2); // can't be sure this will be the same as the central dir
            // the fileName is stored as binary data, the handleUTF8 method will take care of the encoding.
            this.fileName = reader.readData(this.fileNameLength);
            reader.skip(localExtraFieldsLength);

            if (this.compressedSize === -1 || this.uncompressedSize === -1) {
                throw new Error("Bug or corrupted zip : didn't get enough information from the central directory " + "(compressedSize === -1 || uncompressedSize === -1)");
            }

            compression = findCompression(this.compressionMethod);
            if (compression === null) { // no compression found
                throw new Error("Corrupted zip : compression " + utils.pretty(this.compressionMethod) + " unknown (inner file : " + utils.transformTo("string", this.fileName) + ")");
            }
            this.decompressed = new compressedObject(this.compressedSize, this.uncompressedSize, this.crc32, compression, reader.readData(this.compressedSize));
        },

        /**
         * Read the central part of a zip file and add the info in this object.
         * @param {DataReader} reader the reader to use.
         */
        readCentralPart: function(reader) {
            this.versionMadeBy = reader.readInt(2);
            reader.skip(2);
            // this.versionNeeded = reader.readInt(2);
            this.bitFlag = reader.readInt(2);
            this.compressionMethod = reader.readString(2);
            this.date = reader.readDate();
            this.crc32 = reader.readInt(4);
            this.compressedSize = reader.readInt(4);
            this.uncompressedSize = reader.readInt(4);
            var fileNameLength = reader.readInt(2);
            this.extraFieldsLength = reader.readInt(2);
            this.fileCommentLength = reader.readInt(2);
            this.diskNumberStart = reader.readInt(2);
            this.internalFileAttributes = reader.readInt(2);
            this.externalFileAttributes = reader.readInt(4);
            this.localHeaderOffset = reader.readInt(4);

            if (this.isEncrypted()) {
                throw new Error("Encrypted zip are not supported");
            }

            // will be read in the local part, see the comments there
            reader.skip(fileNameLength);
            this.readExtraFields(reader);
            this.parseZIP64ExtraField(reader);
            this.fileComment = reader.readData(this.fileCommentLength);
        },

        /**
         * Parse the external file attributes and get the unix/dos permissions.
         */
        processAttributes: function () {
            this.unixPermissions = null;
            this.dosPermissions = null;
            var madeBy = this.versionMadeBy >> 8;

            // Check if we have the DOS directory flag set.
            // We look for it in the DOS and UNIX permissions
            // but some unknown platform could set it as a compatibility flag.
            this.dir = this.externalFileAttributes & 0x0010 ? true : false;

            if(madeBy === MADE_BY_DOS) {
                // first 6 bits (0 to 5)
                this.dosPermissions = this.externalFileAttributes & 0x3F;
            }

            if(madeBy === MADE_BY_UNIX) {
                this.unixPermissions = (this.externalFileAttributes >> 16) & 0xFFFF;
                // the octal permissions are in (this.unixPermissions & 0x01FF).toString(8);
            }

            // fail safe : if the name ends with a / it probably means a folder
            if (!this.dir && this.fileNameStr.slice(-1) === '/') {
                this.dir = true;
            }
        },

        /**
         * Parse the ZIP64 extra field and merge the info in the current ZipEntry.
         * @param {DataReader} reader the reader to use.
         */
        parseZIP64ExtraField: function(reader) {

            if (!this.extraFields[0x0001]) {
                return;
            }

            // should be something, preparing the extra reader
            var extraReader = readerFor(this.extraFields[0x0001].value);

            // I really hope that these 64bits integer can fit in 32 bits integer, because js
            // won't let us have more.
            if (this.uncompressedSize === utils.MAX_VALUE_32BITS) {
                this.uncompressedSize = extraReader.readInt(8);
            }
            if (this.compressedSize === utils.MAX_VALUE_32BITS) {
                this.compressedSize = extraReader.readInt(8);
            }
            if (this.localHeaderOffset === utils.MAX_VALUE_32BITS) {
                this.localHeaderOffset = extraReader.readInt(8);
            }
            if (this.diskNumberStart === utils.MAX_VALUE_32BITS) {
                this.diskNumberStart = extraReader.readInt(4);
            }
        },
        /**
         * Read the central part of a zip file and add the info in this object.
         * @param {DataReader} reader the reader to use.
         */
        readExtraFields: function(reader) {
            var end = reader.index + this.extraFieldsLength,
                extraFieldId,
                extraFieldLength,
                extraFieldValue;

            if (!this.extraFields) {
                this.extraFields = {};
            }

            while (reader.index + 4 < end) {
                extraFieldId = reader.readInt(2);
                extraFieldLength = reader.readInt(2);
                extraFieldValue = reader.readData(extraFieldLength);

                this.extraFields[extraFieldId] = {
                    id: extraFieldId,
                    length: extraFieldLength,
                    value: extraFieldValue
                };
            }

            reader.setIndex(end);
        },
        /**
         * Apply an UTF8 transformation if needed.
         */
        handleUTF8: function() {
            var decodeParamType = support.uint8array ? "uint8array" : "array";
            if (this.useUTF8()) {
                this.fileNameStr = utf8.utf8decode(this.fileName);
                this.fileCommentStr = utf8.utf8decode(this.fileComment);
            } else {
                var upath = this.findExtraFieldUnicodePath();
                if (upath !== null) {
                    this.fileNameStr = upath;
                } else {
                    // ASCII text or unsupported code page
                    var fileNameByteArray =  utils.transformTo(decodeParamType, this.fileName);
                    this.fileNameStr = this.loadOptions.decodeFileName(fileNameByteArray);
                }

                var ucomment = this.findExtraFieldUnicodeComment();
                if (ucomment !== null) {
                    this.fileCommentStr = ucomment;
                } else {
                    // ASCII text or unsupported code page
                    var commentByteArray =  utils.transformTo(decodeParamType, this.fileComment);
                    this.fileCommentStr = this.loadOptions.decodeFileName(commentByteArray);
                }
            }
        },

        /**
         * Find the unicode path declared in the extra field, if any.
         * @return {String} the unicode path, null otherwise.
         */
        findExtraFieldUnicodePath: function() {
            var upathField = this.extraFields[0x7075];
            if (upathField) {
                var extraReader = readerFor(upathField.value);

                // wrong version
                if (extraReader.readInt(1) !== 1) {
                    return null;
                }

                // the crc of the filename changed, this field is out of date.
                if (crc32_1(this.fileName) !== extraReader.readInt(4)) {
                    return null;
                }

                return utf8.utf8decode(extraReader.readData(upathField.length - 5));
            }
            return null;
        },

        /**
         * Find the unicode comment declared in the extra field, if any.
         * @return {String} the unicode comment, null otherwise.
         */
        findExtraFieldUnicodeComment: function() {
            var ucommentField = this.extraFields[0x6375];
            if (ucommentField) {
                var extraReader = readerFor(ucommentField.value);

                // wrong version
                if (extraReader.readInt(1) !== 1) {
                    return null;
                }

                // the crc of the comment changed, this field is out of date.
                if (crc32_1(this.fileComment) !== extraReader.readInt(4)) {
                    return null;
                }

                return utf8.utf8decode(extraReader.readData(ucommentField.length - 5));
            }
            return null;
        }
    };
    var zipEntry = ZipEntry;

    //  class ZipEntries {{{
    /**
     * All the entries in the zip file.
     * @constructor
     * @param {Object} loadOptions Options for loading the stream.
     */
    function ZipEntries(loadOptions) {
        this.files = [];
        this.loadOptions = loadOptions;
    }
    ZipEntries.prototype = {
        /**
         * Check that the reader is on the specified signature.
         * @param {string} expectedSignature the expected signature.
         * @throws {Error} if it is an other signature.
         */
        checkSignature: function(expectedSignature) {
            if (!this.reader.readAndCheckSignature(expectedSignature)) {
                this.reader.index -= 4;
                var signature = this.reader.readString(4);
                throw new Error("Corrupted zip or bug: unexpected signature " + "(" + utils.pretty(signature) + ", expected " + utils.pretty(expectedSignature) + ")");
            }
        },
        /**
         * Check if the given signature is at the given index.
         * @param {number} askedIndex the index to check.
         * @param {string} expectedSignature the signature to expect.
         * @return {boolean} true if the signature is here, false otherwise.
         */
        isSignature: function(askedIndex, expectedSignature) {
            var currentIndex = this.reader.index;
            this.reader.setIndex(askedIndex);
            var signature = this.reader.readString(4);
            var result = signature === expectedSignature;
            this.reader.setIndex(currentIndex);
            return result;
        },
        /**
         * Read the end of the central directory.
         */
        readBlockEndOfCentral: function() {
            this.diskNumber = this.reader.readInt(2);
            this.diskWithCentralDirStart = this.reader.readInt(2);
            this.centralDirRecordsOnThisDisk = this.reader.readInt(2);
            this.centralDirRecords = this.reader.readInt(2);
            this.centralDirSize = this.reader.readInt(4);
            this.centralDirOffset = this.reader.readInt(4);

            this.zipCommentLength = this.reader.readInt(2);
            // warning : the encoding depends of the system locale
            // On a linux machine with LANG=en_US.utf8, this field is utf8 encoded.
            // On a windows machine, this field is encoded with the localized windows code page.
            var zipComment = this.reader.readData(this.zipCommentLength);
            var decodeParamType = support.uint8array ? "uint8array" : "array";
            // To get consistent behavior with the generation part, we will assume that
            // this is utf8 encoded unless specified otherwise.
            var decodeContent = utils.transformTo(decodeParamType, zipComment);
            this.zipComment = this.loadOptions.decodeFileName(decodeContent);
        },
        /**
         * Read the end of the Zip 64 central directory.
         * Not merged with the method readEndOfCentral :
         * The end of central can coexist with its Zip64 brother,
         * I don't want to read the wrong number of bytes !
         */
        readBlockZip64EndOfCentral: function() {
            this.zip64EndOfCentralSize = this.reader.readInt(8);
            this.reader.skip(4);
            // this.versionMadeBy = this.reader.readString(2);
            // this.versionNeeded = this.reader.readInt(2);
            this.diskNumber = this.reader.readInt(4);
            this.diskWithCentralDirStart = this.reader.readInt(4);
            this.centralDirRecordsOnThisDisk = this.reader.readInt(8);
            this.centralDirRecords = this.reader.readInt(8);
            this.centralDirSize = this.reader.readInt(8);
            this.centralDirOffset = this.reader.readInt(8);

            this.zip64ExtensibleData = {};
            var extraDataSize = this.zip64EndOfCentralSize - 44,
                index = 0,
                extraFieldId,
                extraFieldLength,
                extraFieldValue;
            while (index < extraDataSize) {
                extraFieldId = this.reader.readInt(2);
                extraFieldLength = this.reader.readInt(4);
                extraFieldValue = this.reader.readData(extraFieldLength);
                this.zip64ExtensibleData[extraFieldId] = {
                    id: extraFieldId,
                    length: extraFieldLength,
                    value: extraFieldValue
                };
            }
        },
        /**
         * Read the end of the Zip 64 central directory locator.
         */
        readBlockZip64EndOfCentralLocator: function() {
            this.diskWithZip64CentralDirStart = this.reader.readInt(4);
            this.relativeOffsetEndOfZip64CentralDir = this.reader.readInt(8);
            this.disksCount = this.reader.readInt(4);
            if (this.disksCount > 1) {
                throw new Error("Multi-volumes zip are not supported");
            }
        },
        /**
         * Read the local files, based on the offset read in the central part.
         */
        readLocalFiles: function() {
            var i, file;
            for (i = 0; i < this.files.length; i++) {
                file = this.files[i];
                this.reader.setIndex(file.localHeaderOffset);
                this.checkSignature(signature.LOCAL_FILE_HEADER);
                file.readLocalPart(this.reader);
                file.handleUTF8();
                file.processAttributes();
            }
        },
        /**
         * Read the central directory.
         */
        readCentralDir: function() {
            var file;

            this.reader.setIndex(this.centralDirOffset);
            while (this.reader.readAndCheckSignature(signature.CENTRAL_FILE_HEADER)) {
                file = new zipEntry({
                    zip64: this.zip64
                }, this.loadOptions);
                file.readCentralPart(this.reader);
                this.files.push(file);
            }

            if (this.centralDirRecords !== this.files.length) {
                if (this.centralDirRecords !== 0 && this.files.length === 0) {
                    // We expected some records but couldn't find ANY.
                    // This is really suspicious, as if something went wrong.
                    throw new Error("Corrupted zip or bug: expected " + this.centralDirRecords + " records in central dir, got " + this.files.length);
                }
            }
        },
        /**
         * Read the end of central directory.
         */
        readEndOfCentral: function() {
            var offset = this.reader.lastIndexOfSignature(signature.CENTRAL_DIRECTORY_END);
            if (offset < 0) {
                // Check if the content is a truncated zip or complete garbage.
                // A "LOCAL_FILE_HEADER" is not required at the beginning (auto
                // extractible zip for example) but it can give a good hint.
                // If an ajax request was used without responseType, we will also
                // get unreadable data.
                var isGarbage = !this.isSignature(0, signature.LOCAL_FILE_HEADER);

                if (isGarbage) {
                    throw new Error("Can't find end of central directory : is this a zip file ? " +
                                    "If it is, see https://stuk.github.io/jszip/documentation/howto/read_zip.html");
                } else {
                    throw new Error("Corrupted zip: can't find end of central directory");
                }

            }
            this.reader.setIndex(offset);
            var endOfCentralDirOffset = offset;
            this.checkSignature(signature.CENTRAL_DIRECTORY_END);
            this.readBlockEndOfCentral();


            /* extract from the zip spec :
                4)  If one of the fields in the end of central directory
                    record is too small to hold required data, the field
                    should be set to -1 (0xFFFF or 0xFFFFFFFF) and the
                    ZIP64 format record should be created.
                5)  The end of central directory record and the
                    Zip64 end of central directory locator record must
                    reside on the same disk when splitting or spanning
                    an archive.
             */
            if (this.diskNumber === utils.MAX_VALUE_16BITS || this.diskWithCentralDirStart === utils.MAX_VALUE_16BITS || this.centralDirRecordsOnThisDisk === utils.MAX_VALUE_16BITS || this.centralDirRecords === utils.MAX_VALUE_16BITS || this.centralDirSize === utils.MAX_VALUE_32BITS || this.centralDirOffset === utils.MAX_VALUE_32BITS) {
                this.zip64 = true;

                /*
                Warning : the zip64 extension is supported, but ONLY if the 64bits integer read from
                the zip file can fit into a 32bits integer. This cannot be solved : JavaScript represents
                all numbers as 64-bit double precision IEEE 754 floating point numbers.
                So, we have 53bits for integers and bitwise operations treat everything as 32bits.
                see https://developer.mozilla.org/en-US/docs/JavaScript/Reference/Operators/Bitwise_Operators
                and http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-262.pdf section 8.5
                */

                // should look for a zip64 EOCD locator
                offset = this.reader.lastIndexOfSignature(signature.ZIP64_CENTRAL_DIRECTORY_LOCATOR);
                if (offset < 0) {
                    throw new Error("Corrupted zip: can't find the ZIP64 end of central directory locator");
                }
                this.reader.setIndex(offset);
                this.checkSignature(signature.ZIP64_CENTRAL_DIRECTORY_LOCATOR);
                this.readBlockZip64EndOfCentralLocator();

                // now the zip64 EOCD record
                if (!this.isSignature(this.relativeOffsetEndOfZip64CentralDir, signature.ZIP64_CENTRAL_DIRECTORY_END)) {
                    // console.warn("ZIP64 end of central directory not where expected.");
                    this.relativeOffsetEndOfZip64CentralDir = this.reader.lastIndexOfSignature(signature.ZIP64_CENTRAL_DIRECTORY_END);
                    if (this.relativeOffsetEndOfZip64CentralDir < 0) {
                        throw new Error("Corrupted zip: can't find the ZIP64 end of central directory");
                    }
                }
                this.reader.setIndex(this.relativeOffsetEndOfZip64CentralDir);
                this.checkSignature(signature.ZIP64_CENTRAL_DIRECTORY_END);
                this.readBlockZip64EndOfCentral();
            }

            var expectedEndOfCentralDirOffset = this.centralDirOffset + this.centralDirSize;
            if (this.zip64) {
                expectedEndOfCentralDirOffset += 20; // end of central dir 64 locator
                expectedEndOfCentralDirOffset += 12 /* should not include the leading 12 bytes */ + this.zip64EndOfCentralSize;
            }

            var extraBytes = endOfCentralDirOffset - expectedEndOfCentralDirOffset;

            if (extraBytes > 0) {
                // console.warn(extraBytes, "extra bytes at beginning or within zipfile");
                if (this.isSignature(endOfCentralDirOffset, signature.CENTRAL_FILE_HEADER)) ; else {
                    // the offset is wrong, update the "zero" of the reader
                    // this happens if data has been prepended (crx files for example)
                    this.reader.zero = extraBytes;
                }
            } else if (extraBytes < 0) {
                throw new Error("Corrupted zip: missing " + Math.abs(extraBytes) + " bytes.");
            }
        },
        prepareReader: function(data) {
            this.reader = readerFor(data);
        },
        /**
         * Read a zip file and create ZipEntries.
         * @param {String|ArrayBuffer|Uint8Array|Buffer} data the binary string representing a zip file.
         */
        load: function(data) {
            this.prepareReader(data);
            this.readEndOfCentral();
            this.readCentralDir();
            this.readLocalFiles();
        }
    };
    // }}} end of ZipEntries
    var zipEntries = ZipEntries;

    /**
     * Check the CRC32 of an entry.
     * @param {ZipEntry} zipEntry the zip entry to check.
     * @return {Promise} the result.
     */
    function checkEntryCRC32(zipEntry) {
        return new external.Promise(function (resolve, reject) {
            var worker = zipEntry.decompressed.getContentWorker().pipe(new Crc32Probe_1());
            worker.on("error", function (e) {
                reject(e);
            })
            .on("end", function () {
                if (worker.streamInfo.crc32 !== zipEntry.decompressed.crc32) {
                    reject(new Error("Corrupted zip : CRC32 mismatch"));
                } else {
                    resolve();
                }
            })
            .resume();
        });
    }

    var load = function(data, options) {
        var zip = this;
        options = utils.extend(options || {}, {
            base64: false,
            checkCRC32: false,
            optimizedBinaryString: false,
            createFolders: false,
            decodeFileName: utf8.utf8decode
        });

        if (nodejsUtils.isNode && nodejsUtils.isStream(data)) {
            return external.Promise.reject(new Error("JSZip can't accept a stream when loading a zip file."));
        }

        return utils.prepareContent("the loaded zip file", data, true, options.optimizedBinaryString, options.base64)
        .then(function(data) {
            var zipEntries$1 = new zipEntries(options);
            zipEntries$1.load(data);
            return zipEntries$1;
        }).then(function checkCRC32(zipEntries) {
            var promises = [external.Promise.resolve(zipEntries)];
            var files = zipEntries.files;
            if (options.checkCRC32) {
                for (var i = 0; i < files.length; i++) {
                    promises.push(checkEntryCRC32(files[i]));
                }
            }
            return external.Promise.all(promises);
        }).then(function addFiles(results) {
            var zipEntries = results.shift();
            var files = zipEntries.files;
            for (var i = 0; i < files.length; i++) {
                var input = files[i];
                zip.file(input.fileNameStr, input.decompressed, {
                    binary: true,
                    optimizedBinaryString: true,
                    date: input.date,
                    dir: input.dir,
                    comment : input.fileCommentStr.length ? input.fileCommentStr : null,
                    unixPermissions : input.unixPermissions,
                    dosPermissions : input.dosPermissions,
                    createFolders: options.createFolders
                });
            }
            if (zipEntries.zipComment.length) {
                zip.comment = zipEntries.zipComment;
            }

            return zip;
        });
    };

    /**
     * Representation a of zip file in js
     * @constructor
     */
    function JSZip() {
        // if this constructor is used without `new`, it adds `new` before itself:
        if(!(this instanceof JSZip)) {
            return new JSZip();
        }

        if(arguments.length) {
            throw new Error("The constructor with parameters has been removed in JSZip 3.0, please check the upgrade guide.");
        }

        // object containing the files :
        // {
        //   "folder/" : {...},
        //   "folder/data.txt" : {...}
        // }
        this.files = {};

        this.comment = null;

        // Where we are in the hierarchy
        this.root = "";
        this.clone = function() {
            var newObj = new JSZip();
            for (var i in this) {
                if (typeof this[i] !== "function") {
                    newObj[i] = this[i];
                }
            }
            return newObj;
        };
    }
    JSZip.prototype = object;
    JSZip.prototype.loadAsync = load;
    JSZip.support = support;
    JSZip.defaults = defaults;

    // TODO find a better way to handle this version,
    // a require('package.json').version doesn't work with webpack, see #327
    JSZip.version = "3.5.0";

    JSZip.loadAsync = function (content, options) {
        return new JSZip().loadAsync(content, options);
    };

    JSZip.external = external;
    var lib = JSZip;

    var FileSaver_min = createCommonjsModule(function (module, exports) {
    (function(a,b){b();})(commonjsGlobal,function(){function b(a,b){return "undefined"==typeof b?b={autoBom:!1}:"object"!=typeof b&&(console.warn("Deprecated: Expected third argument to be a object"),b={autoBom:!b}),b.autoBom&&/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(a.type)?new Blob(["\uFEFF",a],{type:a.type}):a}function c(a,b,c){var d=new XMLHttpRequest;d.open("GET",a),d.responseType="blob",d.onload=function(){g(d.response,b,c);},d.onerror=function(){console.error("could not download file");},d.send();}function d(a){var b=new XMLHttpRequest;b.open("HEAD",a,!1);try{b.send();}catch(a){}return 200<=b.status&&299>=b.status}function e(a){try{a.dispatchEvent(new MouseEvent("click"));}catch(c){var b=document.createEvent("MouseEvents");b.initMouseEvent("click",!0,!0,window,0,0,0,80,20,!1,!1,!1,!1,0,null),a.dispatchEvent(b);}}var f="object"==typeof window&&window.window===window?window:"object"==typeof self&&self.self===self?self:"object"==typeof commonjsGlobal&&commonjsGlobal.global===commonjsGlobal?commonjsGlobal:void 0,a=f.navigator&&/Macintosh/.test(navigator.userAgent)&&/AppleWebKit/.test(navigator.userAgent)&&!/Safari/.test(navigator.userAgent),g=f.saveAs||("object"!=typeof window||window!==f?function(){}:"download"in HTMLAnchorElement.prototype&&!a?function(b,g,h){var i=f.URL||f.webkitURL,j=document.createElement("a");g=g||b.name||"download",j.download=g,j.rel="noopener","string"==typeof b?(j.href=b,j.origin===location.origin?e(j):d(j.href)?c(b,g,h):e(j,j.target="_blank")):(j.href=i.createObjectURL(b),setTimeout(function(){i.revokeObjectURL(j.href);},4E4),setTimeout(function(){e(j);},0));}:"msSaveOrOpenBlob"in navigator?function(f,g,h){if(g=g||f.name||"download","string"!=typeof f)navigator.msSaveOrOpenBlob(b(f,h),g);else if(d(f))c(f,g,h);else {var i=document.createElement("a");i.href=f,i.target="_blank",setTimeout(function(){e(i);});}}:function(b,d,e,g){if(g=g||open("","_blank"),g&&(g.document.title=g.document.body.innerText="downloading..."),"string"==typeof b)return c(b,d,e);var h="application/octet-stream"===b.type,i=/constructor/i.test(f.HTMLElement)||f.safari,j=/CriOS\/[\d]+/.test(navigator.userAgent);if((j||h&&i||a)&&"undefined"!=typeof FileReader){var k=new FileReader;k.onloadend=function(){var a=k.result;a=j?a:a.replace(/^data:[^;]*;/,"data:attachment/file;"),g?g.location.href=a:location=a,g=null;},k.readAsDataURL(b);}else {var l=f.URL||f.webkitURL,m=l.createObjectURL(b);g?g.location=m:location.href=m,g=null,setTimeout(function(){l.revokeObjectURL(m);},4E4);}});f.saveAs=g.saveAs=g,(module.exports=g);});


    });

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    const createWritableStore = (key, startValue) => {
      const { subscribe, set } = writable(startValue);

      return {
        subscribe,
        set,
        useLocalStorage: () => {
          const json = localStorage.getItem(key);
          if (json) {
            set(JSON.parse(json));
          }

          subscribe((current) => {
            localStorage.setItem(key, JSON.stringify(current));
          });
        },
      };
    };

    const tiles = createWritableStore("tiles", []);
    const imageData = createWritableStore("imageData", []);
    const grid = createWritableStore("grid", { data: [], x: 0, y: 0 });
    const modalOpen = createWritableStore("modalOpen", false);
    const mode = createWritableStore("mode", "create");

    tiles.useLocalStorage();
    imageData.useLocalStorage();
    modalOpen.useLocalStorage();
    grid.useLocalStorage();

    /* src\Navbar.svelte generated by Svelte v3.31.2 */
    const file = "src\\Navbar.svelte";

    function create_fragment(ctx) {
    	let div;
    	let a0;
    	let t1;
    	let a1;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			a0 = element("a");
    			a0.textContent = "Create";
    			t1 = space();
    			a1 = element("a");
    			a1.textContent = "Generate";
    			attr_dev(a0, "class", "navbar-item");
    			add_location(a0, file, 5, 2, 99);
    			attr_dev(a1, "class", "navbar-item");
    			add_location(a1, file, 6, 2, 168);
    			attr_dev(div, "class", "navbar-start");
    			add_location(div, file, 4, 0, 69);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, a0);
    			append_dev(div, t1);
    			append_dev(div, a1);

    			if (!mounted) {
    				dispose = [
    					listen_dev(a0, "click", mode.set("create"), false, false, false),
    					listen_dev(a1, "click", mode.set("generate"), false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Navbar", slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Navbar> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ mode });
    	return [];
    }

    class Navbar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Navbar",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const imgToDataURI = (img) => {
      return new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64String = reader.result
            .replace("data:", "")
            .replace(/^.+,/, "");
          res(base64String);
        };
        reader.readAsDataURL(img);
      });
    };

    const uriToImage = (type, uri) => {
      const data = `data:${type};base64,${uri}`;
      return data;
    };

    /* src\components\RotateButton.svelte generated by Svelte v3.31.2 */

    const { console: console_1 } = globals;
    const file$1 = "src\\components\\RotateButton.svelte";

    function create_fragment$1(ctx) {
    	let div;
    	let button;
    	let t0_value = /*rotation*/ ctx[1] * 90 + "";
    	let t0;
    	let t1;
    	let button_disabled_value;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			button = element("button");
    			t0 = text(t0_value);
    			t1 = text("°");
    			attr_dev(button, "class", "button is-white");
    			button.disabled = button_disabled_value = /*max*/ ctx[0] === 0;
    			add_location(button, file$1, 8, 2, 186);
    			attr_dev(div, "class", "container svelte-eacjxv");
    			add_location(div, file$1, 7, 0, 159);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, button);
    			append_dev(button, t0);
    			append_dev(button, t1);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", prevent_default(/*click_handler*/ ctx[3]), false, true, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*rotation*/ 2 && t0_value !== (t0_value = /*rotation*/ ctx[1] * 90 + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*max*/ 1 && button_disabled_value !== (button_disabled_value = /*max*/ ctx[0] === 0)) {
    				prop_dev(button, "disabled", button_disabled_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("RotateButton", slots, []);
    	const dispatch = createEventDispatcher();
    	let { max } = $$props;
    	let rotation = 0;
    	const writable_props = ["max"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<RotateButton> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => {
    		$$invalidate(1, rotation = (rotation + 1) % max);
    		console.log(rotation);
    		dispatch("rotate", rotation);
    	};

    	$$self.$$set = $$props => {
    		if ("max" in $$props) $$invalidate(0, max = $$props.max);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		dispatch,
    		max,
    		rotation
    	});

    	$$self.$inject_state = $$props => {
    		if ("max" in $$props) $$invalidate(0, max = $$props.max);
    		if ("rotation" in $$props) $$invalidate(1, rotation = $$props.rotation);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [max, rotation, dispatch, click_handler];
    }

    class RotateButton extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { max: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "RotateButton",
    			options,
    			id: create_fragment$1.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*max*/ ctx[0] === undefined && !("max" in props)) {
    			console_1.warn("<RotateButton> was created without expected prop 'max'");
    		}
    	}

    	get max() {
    		throw new Error("<RotateButton>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set max(value) {
    		throw new Error("<RotateButton>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\PaletteItem.svelte generated by Svelte v3.31.2 */
    const file$2 = "src\\PaletteItem.svelte";

    // (40:2) {:else}
    function create_else_block(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "paletteImg svelte-h9v96s");
    			add_location(div, file$2, 40, 4, 861);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(40:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (33:2) {#if data.uri}
    function create_if_block(ctx) {
    	let img;
    	let img_src_value;
    	let img_alt_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			attr_dev(img, "class", "paletteImg svelte-h9v96s");
    			if (img.src !== (img_src_value = uriToImage(/*data*/ ctx[0].type, /*data*/ ctx[0].uri))) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = /*data*/ ctx[0].name);
    			set_style(img, "transform", "rotate(" + /*data*/ ctx[0].rotation * 90 + "deg)");
    			add_location(img, file$2, 33, 4, 679);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*data*/ 1 && img.src !== (img_src_value = uriToImage(/*data*/ ctx[0].type, /*data*/ ctx[0].uri))) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*data*/ 1 && img_alt_value !== (img_alt_value = /*data*/ ctx[0].name)) {
    				attr_dev(img, "alt", img_alt_value);
    			}

    			if (dirty & /*data*/ 1) {
    				set_style(img, "transform", "rotate(" + /*data*/ ctx[0].rotation * 90 + "deg)");
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(33:2) {#if data.uri}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let div1;
    	let t0;
    	let div0;
    	let h6;
    	let t1_value = /*data*/ ctx[0].displayName + "";
    	let t1;
    	let t2;
    	let rotatebutton;
    	let div1_class_value;
    	let current;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*data*/ ctx[0].uri) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	rotatebutton = new RotateButton({
    			props: { max: /*rotationMax*/ ctx[2] },
    			$$inline: true
    		});

    	rotatebutton.$on("rotate", /*rotate_handler*/ ctx[4]);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			if_block.c();
    			t0 = space();
    			div0 = element("div");
    			h6 = element("h6");
    			t1 = text(t1_value);
    			t2 = space();
    			create_component(rotatebutton.$$.fragment);
    			attr_dev(h6, "class", "is-6 m-0");
    			add_location(h6, file$2, 45, 4, 1024);
    			set_style(div0, "display", "flex");
    			set_style(div0, "flex-direction", "column");
    			set_style(div0, "justify-content", "center");
    			set_style(div0, "flex-grow", "1");
    			set_style(div0, "text-align", "right");
    			add_location(div0, file$2, 42, 2, 900);
    			attr_dev(div1, "class", div1_class_value = "box paletteItem " + (/*active*/ ctx[1] ? "outlined" : "") + " svelte-h9v96s");
    			add_location(div1, file$2, 26, 0, 542);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			if_block.m(div1, null);
    			append_dev(div1, t0);
    			append_dev(div1, div0);
    			append_dev(div0, h6);
    			append_dev(h6, t1);
    			append_dev(div0, t2);
    			mount_component(rotatebutton, div0, null);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(div1, "click", /*click_handler*/ ctx[5], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(div1, t0);
    				}
    			}

    			if ((!current || dirty & /*data*/ 1) && t1_value !== (t1_value = /*data*/ ctx[0].displayName + "")) set_data_dev(t1, t1_value);
    			const rotatebutton_changes = {};
    			if (dirty & /*rotationMax*/ 4) rotatebutton_changes.max = /*rotationMax*/ ctx[2];
    			rotatebutton.$set(rotatebutton_changes);

    			if (!current || dirty & /*active*/ 2 && div1_class_value !== (div1_class_value = "box paletteItem " + (/*active*/ ctx[1] ? "outlined" : "") + " svelte-h9v96s")) {
    				attr_dev(div1, "class", div1_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(rotatebutton.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(rotatebutton.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if_block.d();
    			destroy_component(rotatebutton);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("PaletteItem", slots, []);
    	const dispatch = createEventDispatcher();
    	let { data } = $$props;
    	let { active } = $$props;
    	let rotationMax = 0;

    	const computeRotationMax = char => {
    		if (("LT").includes(char)) {
    			return 4;
    		} else if (char === "I") {
    			return 2;
    		}

    		return 0;
    	};

    	if (data) {
    		rotationMax = computeRotationMax(data.symmetry);
    	}

    	const writable_props = ["data", "active"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<PaletteItem> was created with unknown prop '${key}'`);
    	});

    	function rotate_handler(event) {
    		bubble($$self, event);
    	}

    	const click_handler = () => {
    		dispatch("select");
    	};

    	$$self.$$set = $$props => {
    		if ("data" in $$props) $$invalidate(0, data = $$props.data);
    		if ("active" in $$props) $$invalidate(1, active = $$props.active);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		uriToImage,
    		dispatch,
    		RotateButton,
    		data,
    		active,
    		rotationMax,
    		computeRotationMax
    	});

    	$$self.$inject_state = $$props => {
    		if ("data" in $$props) $$invalidate(0, data = $$props.data);
    		if ("active" in $$props) $$invalidate(1, active = $$props.active);
    		if ("rotationMax" in $$props) $$invalidate(2, rotationMax = $$props.rotationMax);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [data, active, rotationMax, dispatch, rotate_handler, click_handler];
    }

    class PaletteItem extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { data: 0, active: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "PaletteItem",
    			options,
    			id: create_fragment$2.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*data*/ ctx[0] === undefined && !("data" in props)) {
    			console.warn("<PaletteItem> was created without expected prop 'data'");
    		}

    		if (/*active*/ ctx[1] === undefined && !("active" in props)) {
    			console.warn("<PaletteItem> was created without expected prop 'active'");
    		}
    	}

    	get data() {
    		throw new Error("<PaletteItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<PaletteItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get active() {
    		throw new Error("<PaletteItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set active(value) {
    		throw new Error("<PaletteItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Palette.svelte generated by Svelte v3.31.2 */

    const { console: console_1$1 } = globals;
    const file$3 = "src\\Palette.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i];
    	child_ctx[10] = i;
    	return child_ctx;
    }

    // (43:4) {#each $tiles as tile, i}
    function create_each_block(ctx) {
    	let paletteitem;
    	let current;

    	function select_handler_1() {
    		return /*select_handler_1*/ ctx[6](/*i*/ ctx[10]);
    	}

    	function rotate_handler(...args) {
    		return /*rotate_handler*/ ctx[7](/*i*/ ctx[10], ...args);
    	}

    	paletteitem = new PaletteItem({
    			props: {
    				data: /*tile*/ ctx[8],
    				active: /*selectedIndex*/ ctx[0] === /*i*/ ctx[10]
    			},
    			$$inline: true
    		});

    	paletteitem.$on("select", select_handler_1);
    	paletteitem.$on("rotate", rotate_handler);

    	const block = {
    		c: function create() {
    			create_component(paletteitem.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(paletteitem, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const paletteitem_changes = {};
    			if (dirty & /*$tiles*/ 2) paletteitem_changes.data = /*tile*/ ctx[8];
    			if (dirty & /*selectedIndex*/ 1) paletteitem_changes.active = /*selectedIndex*/ ctx[0] === /*i*/ ctx[10];
    			paletteitem.$set(paletteitem_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(paletteitem.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(paletteitem.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(paletteitem, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(43:4) {#each $tiles as tile, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div2;
    	let div0;
    	let h3;
    	let t1;
    	let button;
    	let span;
    	let t3;
    	let ion_icon;
    	let t4;
    	let div1;
    	let paletteitem;
    	let t5;
    	let current;
    	let mounted;
    	let dispose;

    	paletteitem = new PaletteItem({
    			props: {
    				data: { displayName: "delete", data: null },
    				active: /*selectedIndex*/ ctx[0] === -1
    			},
    			$$inline: true
    		});

    	paletteitem.$on("select", /*select_handler*/ ctx[5]);
    	let each_value = /*$tiles*/ ctx[1];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			h3 = element("h3");
    			h3.textContent = "Palette";
    			t1 = space();
    			button = element("button");
    			span = element("span");
    			span.textContent = "edit palette";
    			t3 = space();
    			ion_icon = element("ion-icon");
    			t4 = space();
    			div1 = element("div");
    			create_component(paletteitem.$$.fragment);
    			t5 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(h3, "class", "is-3");
    			add_location(h3, file$3, 20, 4, 479);
    			add_location(span, file$3, 29, 6, 669);
    			set_custom_element_data(ion_icon, "name", "settings-outline");
    			add_location(ion_icon, file$3, 30, 6, 702);
    			attr_dev(button, "class", "button is-fullwidth");
    			add_location(button, file$3, 22, 4, 516);
    			attr_dev(div0, "class", "block p-3");
    			add_location(div0, file$3, 19, 2, 450);
    			attr_dev(div1, "class", "block scrollable p-3 svelte-2hdpuw");
    			add_location(div1, file$3, 33, 2, 767);
    			attr_dev(div2, "class", "paletteContainer p-4 svelte-2hdpuw");
    			add_location(div2, file$3, 18, 0, 412);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, h3);
    			append_dev(div0, t1);
    			append_dev(div0, button);
    			append_dev(button, span);
    			append_dev(button, t3);
    			append_dev(button, ion_icon);
    			append_dev(div2, t4);
    			append_dev(div2, div1);
    			mount_component(paletteitem, div1, null);
    			append_dev(div1, t5);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[4], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			const paletteitem_changes = {};
    			if (dirty & /*selectedIndex*/ 1) paletteitem_changes.active = /*selectedIndex*/ ctx[0] === -1;
    			paletteitem.$set(paletteitem_changes);

    			if (dirty & /*$tiles, selectedIndex, updateIndex, updateRotation*/ 15) {
    				each_value = /*$tiles*/ ctx[1];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div1, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(paletteitem.$$.fragment, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(paletteitem.$$.fragment, local);
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_component(paletteitem);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $tiles;
    	validate_store(tiles, "tiles");
    	component_subscribe($$self, tiles, $$value => $$invalidate(1, $tiles = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Palette", slots, []);
    	let { selectedIndex = -1 } = $$props;

    	const updateRotation = (index, rotationValue) => {
    		const newTiles = [...$tiles];
    		newTiles[index].rotation = rotationValue;
    		tiles.set(newTiles);
    	};

    	const updateIndex = index => {
    		$$invalidate(0, selectedIndex = index);
    	};

    	const writable_props = ["selectedIndex"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$1.warn(`<Palette> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => {
    		console.log("press");
    		modalOpen.set(true);
    	};

    	const select_handler = () => {
    		updateIndex(-1);
    	};

    	const select_handler_1 = i => {
    		updateIndex(i);
    	};

    	const rotate_handler = (i, e) => {
    		updateRotation(i, e.detail);
    	};

    	$$self.$$set = $$props => {
    		if ("selectedIndex" in $$props) $$invalidate(0, selectedIndex = $$props.selectedIndex);
    	};

    	$$self.$capture_state = () => ({
    		PaletteItem,
    		tiles,
    		modalOpen,
    		selectedIndex,
    		updateRotation,
    		updateIndex,
    		$tiles
    	});

    	$$self.$inject_state = $$props => {
    		if ("selectedIndex" in $$props) $$invalidate(0, selectedIndex = $$props.selectedIndex);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		selectedIndex,
    		$tiles,
    		updateRotation,
    		updateIndex,
    		click_handler,
    		select_handler,
    		select_handler_1,
    		rotate_handler
    	];
    }

    class Palette extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { selectedIndex: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Palette",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get selectedIndex() {
    		throw new Error("<Palette>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set selectedIndex(value) {
    		throw new Error("<Palette>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\TileImage.svelte generated by Svelte v3.31.2 */

    const { console: console_1$2 } = globals;
    const file$4 = "src\\components\\TileImage.svelte";

    // (15:0) {:else}
    function create_else_block$1(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "gridImg gridPlaceholder svelte-nigsy4");
    			add_location(div, file$4, 15, 2, 253);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(15:0) {:else}",
    		ctx
    	});

    	return block;
    }

    // (7:0) {#if tex}
    function create_if_block$1(ctx) {
    	let img;
    	let img_src_value;

    	const block = {
    		c: function create() {
    			img = element("img");
    			attr_dev(img, "class", "gridImg svelte-nigsy4");
    			if (img.src !== (img_src_value = /*tex*/ ctx[0])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", /*name*/ ctx[2]);
    			attr_dev(img, "draggable", false);
    			set_style(img, "transform", "rotate(" + (/*rotation*/ ctx[1] * 90 || 0) + "deg)");
    			add_location(img, file$4, 7, 2, 99);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, img, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*tex*/ 1 && img.src !== (img_src_value = /*tex*/ ctx[0])) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*name*/ 4) {
    				attr_dev(img, "alt", /*name*/ ctx[2]);
    			}

    			if (dirty & /*rotation*/ 2) {
    				set_style(img, "transform", "rotate(" + (/*rotation*/ ctx[1] * 90 || 0) + "deg)");
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(img);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(7:0) {#if tex}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*tex*/ ctx[0]) return create_if_block$1;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("TileImage", slots, []);
    	let { tex } = $$props, { rotation } = $$props, { name } = $$props;
    	console.log(rotation);
    	const writable_props = ["tex", "rotation", "name"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$2.warn(`<TileImage> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ("tex" in $$props) $$invalidate(0, tex = $$props.tex);
    		if ("rotation" in $$props) $$invalidate(1, rotation = $$props.rotation);
    		if ("name" in $$props) $$invalidate(2, name = $$props.name);
    	};

    	$$self.$capture_state = () => ({ tex, rotation, name });

    	$$self.$inject_state = $$props => {
    		if ("tex" in $$props) $$invalidate(0, tex = $$props.tex);
    		if ("rotation" in $$props) $$invalidate(1, rotation = $$props.rotation);
    		if ("name" in $$props) $$invalidate(2, name = $$props.name);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [tex, rotation, name];
    }

    class TileImage extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { tex: 0, rotation: 1, name: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TileImage",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*tex*/ ctx[0] === undefined && !("tex" in props)) {
    			console_1$2.warn("<TileImage> was created without expected prop 'tex'");
    		}

    		if (/*rotation*/ ctx[1] === undefined && !("rotation" in props)) {
    			console_1$2.warn("<TileImage> was created without expected prop 'rotation'");
    		}

    		if (/*name*/ ctx[2] === undefined && !("name" in props)) {
    			console_1$2.warn("<TileImage> was created without expected prop 'name'");
    		}
    	}

    	get tex() {
    		throw new Error("<TileImage>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tex(value) {
    		throw new Error("<TileImage>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get rotation() {
    		throw new Error("<TileImage>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set rotation(value) {
    		throw new Error("<TileImage>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get name() {
    		throw new Error("<TileImage>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<TileImage>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Canvas.svelte generated by Svelte v3.31.2 */

    const { console: console_1$3 } = globals;
    const file$5 = "src\\Canvas.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[19] = list[i];
    	child_ctx[21] = i;
    	return child_ctx;
    }

    // (86:4) {#each $grid.data as gridElem, i}
    function create_each_block$1(ctx) {
    	let div1;
    	let div0;
    	let tileimage;
    	let t;
    	let current;
    	let mounted;
    	let dispose;

    	tileimage = new TileImage({
    			props: {
    				name: /*gridElem*/ ctx[19].name,
    				tex: /*$grid*/ ctx[3].data[/*gridElem*/ ctx[19].data]
    				? uriToImage(/*$tiles*/ ctx[4][/*gridElem*/ ctx[19].tex].data)
    				: undefined,
    				rotation: /*gridElem*/ ctx[19].rotation
    			},
    			$$inline: true
    		});

    	function mousedown_handler() {
    		return /*mousedown_handler*/ ctx[14](/*i*/ ctx[21]);
    	}

    	function mouseenter_handler() {
    		return /*mouseenter_handler*/ ctx[15](/*i*/ ctx[21]);
    	}

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			create_component(tileimage.$$.fragment);
    			t = space();
    			attr_dev(div0, "class", "gridElementContent svelte-1irdpy1");
    			add_location(div0, file$5, 107, 8, 2751);
    			attr_dev(div1, "class", "gridElement svelte-1irdpy1");
    			add_location(div1, file$5, 86, 6, 2188);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			mount_component(tileimage, div0, null);
    			append_dev(div1, t);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(div1, "mousedown", prevent_default(mousedown_handler), false, true, false),
    					listen_dev(div1, "mouseenter", mouseenter_handler, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const tileimage_changes = {};
    			if (dirty & /*$grid*/ 8) tileimage_changes.name = /*gridElem*/ ctx[19].name;

    			if (dirty & /*$grid, $tiles*/ 24) tileimage_changes.tex = /*$grid*/ ctx[3].data[/*gridElem*/ ctx[19].data]
    			? uriToImage(/*$tiles*/ ctx[4][/*gridElem*/ ctx[19].tex].data)
    			: undefined;

    			if (dirty & /*$grid*/ 8) tileimage_changes.rotation = /*gridElem*/ ctx[19].rotation;
    			tileimage.$set(tileimage_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tileimage.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tileimage.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			destroy_component(tileimage);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(86:4) {#each $grid.data as gridElem, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let div2;
    	let div0;
    	let h3;
    	let t1;
    	let button0;
    	let t3;
    	let button1;
    	let t4;
    	let button1_disabled_value;
    	let t5;
    	let button2;
    	let t7;
    	let div1;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value = /*$grid*/ ctx[3].data;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			h3 = element("h3");
    			h3.textContent = "Canvas";
    			t1 = space();
    			button0 = element("button");
    			button0.textContent = "submit";
    			t3 = space();
    			button1 = element("button");
    			t4 = text("download");
    			t5 = space();
    			button2 = element("button");
    			button2.textContent = "clear";
    			t7 = space();
    			div1 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(h3, "class", "is-3");
    			add_location(h3, file$5, 60, 4, 1454);
    			attr_dev(button0, "class", "button is-outlined");
    			add_location(button0, file$5, 61, 4, 1488);
    			attr_dev(button1, "class", "button is-outlined is-success");
    			button1.disabled = button1_disabled_value = !/*configIsUptoDate*/ ctx[2];
    			add_location(button1, file$5, 68, 4, 1691);
    			attr_dev(button2, "class", "button is-outlined is-danger");
    			add_location(button2, file$5, 76, 4, 1915);
    			attr_dev(div0, "class", "block p-3");
    			add_location(div0, file$5, 59, 2, 1425);
    			attr_dev(div1, "class", "grid svelte-1irdpy1");
    			set_style(div1, "grid-template-columns", "repeat(" + /*x*/ ctx[6] + ", 1fr");
    			add_location(div1, file$5, 84, 2, 2075);
    			attr_dev(div2, "class", "gridContainer p-4 svelte-1irdpy1");
    			add_location(div2, file$5, 47, 0, 1216);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, h3);
    			append_dev(div0, t1);
    			append_dev(div0, button0);
    			append_dev(div0, t3);
    			append_dev(div0, button1);
    			append_dev(button1, t4);
    			append_dev(div0, t5);
    			append_dev(div0, button2);
    			append_dev(div2, t7);
    			append_dev(div2, div1);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div1, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[11], false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[12], false, false, false),
    					listen_dev(button2, "click", /*click_handler_2*/ ctx[13], false, false, false),
    					listen_dev(div2, "mousedown", /*mousedown_handler_1*/ ctx[16], false, false, false),
    					listen_dev(div2, "mouseup", /*mouseup_handler*/ ctx[17], false, false, false),
    					listen_dev(div2, "mouseleave", /*mouseleave_handler*/ ctx[18], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*configIsUptoDate*/ 4 && button1_disabled_value !== (button1_disabled_value = !/*configIsUptoDate*/ ctx[2])) {
    				prop_dev(button1, "disabled", button1_disabled_value);
    			}

    			if (dirty & /*updateTiles, selectedIndex, $tiles, undefined, mouseIsDown, $grid, uriToImage*/ 539) {
    				each_value = /*$grid*/ ctx[3].data;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(div1, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let $grid;
    	let $tiles;
    	validate_store(grid, "grid");
    	component_subscribe($$self, grid, $$value => $$invalidate(3, $grid = $$value));
    	validate_store(tiles, "tiles");
    	component_subscribe($$self, tiles, $$value => $$invalidate(4, $tiles = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("Canvas", slots, []);
    	const dispatch = createEventDispatcher();
    	let { selectedIndex } = $$props;
    	let { data } = $$props;
    	let x = 10;
    	let y = 10;
    	let mouseIsDown = false;
    	let configIsUptoDate = false;

    	const createGrid = (width, height) => {
    		const newGrid = [];

    		for (let i = 0; i < height; i++) {
    			for (let j = 0; j < width; j++) {
    				newGrid.push({ tex: -1, x: j, y: i });
    			}
    		}

    		return { data: newGrid, x: width, y: height };
    	};

    	onMount(() => {
    		console.log($grid);

    		if ($grid.data.length === 0) {
    			grid.set(createGrid(x, y));
    			console.log($grid);
    		}
    	});

    	const updateTiles = (elementIndex, texIndex, rotation) => {
    		console.log(elementIndex, texIndex, rotation);
    		const newGrid = { ...$grid };
    		console.log(newGrid);
    		newGrid.data[elementIndex].tex = texIndex;
    		newGrid.data[elementIndex].rotation = rotation || 0;
    		grid.set(newGrid);
    		$$invalidate(2, configIsUptoDate = false);
    	};

    	const writable_props = ["selectedIndex", "data"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$3.warn(`<Canvas> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => {
    		$$invalidate(2, configIsUptoDate = true);
    		dispatch("submitGrid", { grid, resolution: { x, y } });
    	};

    	const click_handler_1 = () => {
    		$$invalidate(2, configIsUptoDate = true);
    		dispatch("downloadConfig");
    	};

    	const click_handler_2 = () => {
    		grid.set(createGrid(x, y));
    	};

    	const mousedown_handler = i => {
    		updateTiles(i, selectedIndex, selectedIndex > -1
    		? $tiles[selectedIndex].rotation
    		: undefined);
    	};

    	const mouseenter_handler = i => {
    		if (mouseIsDown) {
    			updateTiles(i, selectedIndex, selectedIndex > -1
    			? $grid.data[selectedIndex].rotation
    			: undefined);
    		}
    	};

    	const mousedown_handler_1 = () => {
    		$$invalidate(1, mouseIsDown = true);
    	};

    	const mouseup_handler = () => {
    		$$invalidate(1, mouseIsDown = false);
    	};

    	const mouseleave_handler = () => {
    		$$invalidate(1, mouseIsDown = false);
    	};

    	$$self.$$set = $$props => {
    		if ("selectedIndex" in $$props) $$invalidate(0, selectedIndex = $$props.selectedIndex);
    		if ("data" in $$props) $$invalidate(10, data = $$props.data);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		createEventDispatcher,
    		tiles,
    		grid,
    		uriToImage,
    		TileImage,
    		dispatch,
    		selectedIndex,
    		data,
    		x,
    		y,
    		mouseIsDown,
    		configIsUptoDate,
    		createGrid,
    		updateTiles,
    		$grid,
    		$tiles
    	});

    	$$self.$inject_state = $$props => {
    		if ("selectedIndex" in $$props) $$invalidate(0, selectedIndex = $$props.selectedIndex);
    		if ("data" in $$props) $$invalidate(10, data = $$props.data);
    		if ("x" in $$props) $$invalidate(6, x = $$props.x);
    		if ("y" in $$props) $$invalidate(7, y = $$props.y);
    		if ("mouseIsDown" in $$props) $$invalidate(1, mouseIsDown = $$props.mouseIsDown);
    		if ("configIsUptoDate" in $$props) $$invalidate(2, configIsUptoDate = $$props.configIsUptoDate);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		selectedIndex,
    		mouseIsDown,
    		configIsUptoDate,
    		$grid,
    		$tiles,
    		dispatch,
    		x,
    		y,
    		createGrid,
    		updateTiles,
    		data,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		mousedown_handler,
    		mouseenter_handler,
    		mousedown_handler_1,
    		mouseup_handler,
    		mouseleave_handler
    	];
    }

    class Canvas extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { selectedIndex: 0, data: 10 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Canvas",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*selectedIndex*/ ctx[0] === undefined && !("selectedIndex" in props)) {
    			console_1$3.warn("<Canvas> was created without expected prop 'selectedIndex'");
    		}

    		if (/*data*/ ctx[10] === undefined && !("data" in props)) {
    			console_1$3.warn("<Canvas> was created without expected prop 'data'");
    		}
    	}

    	get selectedIndex() {
    		throw new Error("<Canvas>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set selectedIndex(value) {
    		throw new Error("<Canvas>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get data() {
    		throw new Error("<Canvas>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<Canvas>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /**
     * toString ref.
     */

    var toString$3 = Object.prototype.toString;

    /**
     * Return the type of `val`.
     *
     * @param {Mixed} val
     * @return {String}
     * @api public
     */

    var componentType = function(val){
      switch (toString$3.call(val)) {
        case '[object Date]': return 'date';
        case '[object RegExp]': return 'regexp';
        case '[object Arguments]': return 'arguments';
        case '[object Array]': return 'array';
        case '[object Error]': return 'error';
      }

      if (val === null) return 'null';
      if (val === undefined) return 'undefined';
      if (val !== val) return 'nan';
      if (val && val.nodeType === 1) return 'element';

      if (isBuffer$1(val)) return 'buffer';

      val = val.valueOf
        ? val.valueOf()
        : Object.prototype.valueOf.apply(val);

      return typeof val;
    };

    // code borrowed from https://github.com/feross/is-buffer/blob/master/index.js
    function isBuffer$1(obj) {
      return !!(obj != null &&
        (obj._isBuffer || // For Safari 5-7 (missing Object.prototype.constructor)
          (obj.constructor &&
          typeof obj.constructor.isBuffer === 'function' &&
          obj.constructor.isBuffer(obj))
        ))
    }

    /**
     * Set given `path`
     *
     * @param {Object} obj
     * @param {String} path
     * @param {Mixed} val
     * @api public
     */

    var set = function (obj, path, val) {
      var segs = path.split('.');
      var attr = segs.pop();
      
      for (var i = 0; i < segs.length; i++) {
        var seg = segs[i];
        obj[seg] = obj[seg] || {};
        obj = obj[seg];
      }
      
      obj[attr] = val;
    };

    /**
     * Get given `path`
     *
     * @param {Object} obj
     * @param {String} path
     * @return {Mixed}
     * @api public
     */

    var get = function (obj, path) {
      var segs = path.split('.');
      var attr = segs.pop();
      
      for (var i = 0; i < segs.length; i++) {
        var seg = segs[i];
        if (!obj[seg]) return;
        obj = obj[seg];
      }
      
      return obj[attr];
    };

    var eivindfjeldstadDot = {
    	set: set,
    	get: get
    };

    var typecast_1 = typecast;

    /**
     * Cast given `val` to `type`
     *
     * @param {Mixed} val
     * @param {String} type
     * @api public
     */

    function typecast (val, type) {
      var fn = typecast[type];
      if (typeof fn != 'function') throw new Error('cannot cast to ' + type);
      return fn(val);
    }

    /**
     * Cast `val` to `String`
     *
     * @param {Mixed} val
     * @api public
     */

    typecast.string = function (val) {
      return val.toString();
    };

    /**
     * Cast `val` to `Number`
     *
     * @param {Mixed} val
     * @api public
     */

    typecast.number = function (val) {
      var num = parseFloat(val);
      return isNaN(num)
        ? null
        : num;
    };

    /**
     * Cast `val` to a`Date`
     *
     * @param {Mixed} val
     * @api public
     */

    typecast.date = function (val) {
      var date = new Date(val);
      return isNaN(date.valueOf())
        ? null
        : date;
    };

    /**
     * Cast `val` to `Array`
     *
     * @param {Mixed} val
     * @api public
     */

    typecast.array = function (val) {
      if (val instanceof Array) return val;
      var arr = val.toString().split(',');
      for (var i = 0; i < arr.length; i++) {
        arr[i] = arr[i].trim();
      }
      return arr;
    };

    /**
     * Cast `val` to `Boolean`
     *
     * @param {Mixed} val
     * @api public
     */

    typecast.boolean = function (val) {
      return !! val && val !== 'false';
    };

    var error = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports["default"] = void 0;

    function _typeof(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof = function _typeof(obj) { return typeof obj; }; } else { _typeof = function _typeof(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof(obj); }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _possibleConstructorReturn(self, call) { if (call && (_typeof(call) === "object" || typeof call === "function")) { return call; } return _assertThisInitialized(self); }

    function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); if (superClass) _setPrototypeOf(subClass, superClass); }

    function _wrapNativeSuper(Class) { var _cache = typeof Map === "function" ? new Map() : undefined; _wrapNativeSuper = function _wrapNativeSuper(Class) { if (Class === null || !_isNativeFunction(Class)) return Class; if (typeof Class !== "function") { throw new TypeError("Super expression must either be null or a function"); } if (typeof _cache !== "undefined") { if (_cache.has(Class)) return _cache.get(Class); _cache.set(Class, Wrapper); } function Wrapper() { return _construct(Class, arguments, _getPrototypeOf(this).constructor); } Wrapper.prototype = Object.create(Class.prototype, { constructor: { value: Wrapper, enumerable: false, writable: true, configurable: true } }); return _setPrototypeOf(Wrapper, Class); }; return _wrapNativeSuper(Class); }

    function isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Date.prototype.toString.call(Reflect.construct(Date, [], function () {})); return true; } catch (e) { return false; } }

    function _construct(Parent, args, Class) { if (isNativeReflectConstruct()) { _construct = Reflect.construct; } else { _construct = function _construct(Parent, args, Class) { var a = [null]; a.push.apply(a, args); var Constructor = Function.bind.apply(Parent, a); var instance = new Constructor(); if (Class) _setPrototypeOf(instance, Class.prototype); return instance; }; } return _construct.apply(null, arguments); }

    function _isNativeFunction(fn) { return Function.toString.call(fn).indexOf("[native code]") !== -1; }

    function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

    function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

    /**
     * Custom errors.
     *
     * @private
     */
    var ValidationError =
    /*#__PURE__*/
    function (_Error) {
      _inherits(ValidationError, _Error);

      function ValidationError(message, path) {
        var _this;

        _classCallCheck(this, ValidationError);

        _this = _possibleConstructorReturn(this, _getPrototypeOf(ValidationError).call(this, message));
        defineProp(_assertThisInitialized(_this), 'path', path);
        defineProp(_assertThisInitialized(_this), 'expose', true);
        defineProp(_assertThisInitialized(_this), 'status', 400);

        if (Error.captureStackTrace) {
          Error.captureStackTrace(_assertThisInitialized(_this), ValidationError);
        }

        return _this;
      }

      return ValidationError;
    }(_wrapNativeSuper(Error));

    exports["default"] = ValidationError;

    var defineProp = function defineProp(obj, prop, val) {
      Object.defineProperty(obj, prop, {
        enumerable: false,
        configurable: true,
        writable: true,
        value: val
      });
    };

    module.exports = exports.default;
    });

    var utils$1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.assign = assign;
    exports.walk = walk;
    exports.join = join;

    var _eivindfjeldstadDot = _interopRequireDefault(eivindfjeldstadDot);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

    /**
     * Assign given key and value (or object) to given object
     *
     * @private
     */
    function assign(key, val, obj) {
      if (typeof key == 'string') {
        obj[key] = val;
        return;
      }

      Object.keys(key).forEach(function (k) {
        return obj[k] = key[k];
      });
    }
    /**
     * Walk path
     *
     * @private
     */


    function walk(path, obj, callback) {
      var parts = path.split(/\.\$(?=\.|$)/);
      var first = parts.shift();

      var arr = _eivindfjeldstadDot["default"].get(obj, first);

      if (!parts.length) {
        return callback(first, arr);
      }

      if (!Array.isArray(arr)) {
        return;
      }

      for (var i = 0; i < arr.length; i++) {
        var current = join(i, first);
        var next = current + parts.join('.$');
        walk(next, obj, callback);
      }
    }
    /**
     * Join `path` with `prefix`
     *
     * @private
     */


    function join(path, prefix) {
      return prefix ? "".concat(prefix, ".").concat(path) : path;
    }
    });

    var property = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports["default"] = void 0;

    var _error2 = _interopRequireDefault(error);



    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

    function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

    function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

    function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

    function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

    function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

    function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

    function _iterableToArrayLimit(arr, i) { if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) { return; } var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

    function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

    function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

    /**
     * A property instance gets returned whenever you call `schema.path()`.
     * Properties are also created internally when an object is passed to the Schema constructor.
     *
     * @param {String} name - the name of the property
     * @param {Schema} schema - parent schema
     */
    var Property =
    /*#__PURE__*/
    function () {
      function Property(name, schema) {
        _classCallCheck(this, Property);

        this.name = name;
        this.registry = {};
        this._schema = schema;
        this._type = null;
        this.messages = {};
      }
      /**
       * Registers messages.
       *
       * @example
       * prop.message('something is wrong')
       * prop.message({ required: 'thing is required.' })
       *
       * @param {Object|String} messages
       * @return {Property}
       */


      _createClass(Property, [{
        key: "message",
        value: function message(messages) {
          if (typeof messages == 'string') {
            messages = {
              "default": messages
            };
          }

          var entries = Object.entries(messages);

          for (var _i = 0, _entries = entries; _i < _entries.length; _i++) {
            var _entries$_i = _slicedToArray(_entries[_i], 2),
                key = _entries$_i[0],
                val = _entries$_i[1];

            this.messages[key] = val;
          }

          return this;
        }
        /**
         * Mount given `schema` on current path.
         *
         * @example
         * const user = new Schema({ email: String })
         * prop.schema(user)
         *
         * @param {Schema} schema - the schema to mount
         * @return {Property}
         */

      }, {
        key: "schema",
        value: function schema(_schema) {
          this._schema.path(this.name, _schema);

          return this;
        }
        /**
         * Validate using named functions from the given object.
         * Error messages can be defined by providing an object with
         * named error messages/generators to `schema.message()`
         *
         * The message generator receives the value being validated,
         * the object it belongs to and any additional arguments.
         *
         * @example
         * const schema = new Schema()
         * const prop = schema.path('some.path')
         *
         * schema.message({
         *   binary: (path, ctx) => `${path} must be binary.`,
         *   bits: (path, ctx, bits) => `${path} must be ${bits}-bit`
         * })
         *
         * prop.use({
         *   binary: (val, ctx) => /^[01]+$/i.test(val),
         *   bits: [(val, ctx, bits) => val.length == bits, 32]
         * })
         *
         * @param {Object} fns - object with named validation functions to call
         * @return {Property}
         */

      }, {
        key: "use",
        value: function use(fns) {
          var _this = this;

          Object.keys(fns).forEach(function (name) {
            var arr = fns[name];
            if (!Array.isArray(arr)) arr = [arr];
            var fn = arr.shift();

            _this._register(name, arr, fn);
          });
          return this;
        }
        /**
         * Registers a validator that checks for presence.
         *
         * @example
         * prop.required()
         *
         * @param {Boolean} [bool] - `true` if required, `false` otherwise
         * @return {Property}
         */

      }, {
        key: "required",
        value: function required() {
          var bool = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : true;
          return this._register('required', [bool]);
        }
        /**
         * Registers a validator that checks if a value is of a given `type`
         *
         * @example
         * prop.type(String)
         *
         * @example
         * prop.type('string')
         *
         * @param {String|Function} type - type to check for
         * @return {Property}
         */

      }, {
        key: "type",
        value: function type(_type) {
          this._type = _type;
          return this._register('type', [_type]);
        }
        /**
         * Convenience method for setting type to `String`
         *
         * @example
         * prop.string()
         *
         * @return {Property}
         */

      }, {
        key: "string",
        value: function string() {
          return this.type(String);
        }
        /**
         * Convenience method for setting type to `Number`
         *
         * @example
         * prop.number()
         *
         * @return {Property}
         */

      }, {
        key: "number",
        value: function number() {
          return this.type(Number);
        }
        /**
         * Convenience method for setting type to `Array`
         *
         * @example
         * prop.array()
         *
         * @return {Property}
         */

      }, {
        key: "array",
        value: function array() {
          return this.type(Array);
        }
        /**
         * Convenience method for setting type to `Date`
         *
         * @example
         * prop.date()
         *
         * @return {Property}
         */

      }, {
        key: "date",
        value: function date() {
          return this.type(Date);
        }
        /**
         * Registers a validator that checks length.
         *
         * @example
         * prop.length({ min: 8, max: 255 })
         * prop.length(10)
         *
         * @param {Object|Number} rules - object with `.min` and `.max` properties or a number
         * @param {Number} rules.min - minimum length
         * @param {Number} rules.max - maximum length
         * @return {Property}
         */

      }, {
        key: "length",
        value: function length(rules) {
          return this._register('length', [rules]);
        }
        /**
         * Registers a validator that checks size.
         *
         * @example
         * prop.size({ min: 8, max: 255 })
         * prop.size(10)
         *
         * @param {Object|Number} rules - object with `.min` and `.max` properties or a number
         * @param {Number} rules.min - minimum size
         * @param {Number} rules.max - maximum size
         * @return {Property}
         */

      }, {
        key: "size",
        value: function size(rules) {
          return this._register('size', [rules]);
        }
        /**
         * Registers a validator for enums.
         *
         * @example
         * prop.enum(['cat', 'dog'])
         *
         * @param {Array} rules - allowed values
         * @return {Property}
         */

      }, {
        key: "enum",
        value: function _enum(enums) {
          return this._register('enum', [enums]);
        }
        /**
         * Registers a validator that checks if a value matches given `regexp`.
         *
         * @example
         * prop.match(/some\sregular\sexpression/)
         *
         * @param {RegExp} regexp - regular expression to match
         * @return {Property}
         */

      }, {
        key: "match",
        value: function match(regexp) {
          return this._register('match', [regexp]);
        }
        /**
         * Registers a validator that checks each value in an array against given `rules`.
         *
         * @example
         * prop.each({ type: String })
         * prop.each([{ type: Number }])
         * prop.each({ things: [{ type: String }]})
         * prop.each(schema)
         *
         * @param {Array|Object|Schema|Property} rules - rules to use
         * @return {Property}
         */

      }, {
        key: "each",
        value: function each(rules) {
          this._schema.path((0, utils$1.join)('$', this.name), rules);

          return this;
        }
        /**
         * Registers paths for array elements on the parent schema, with given array of rules.
         *
         * @example
         * prop.elements([{ type: String }, { type: Number }])
         *
         * @param {Array} arr - array of rules to use
         * @return {Property}
         */

      }, {
        key: "elements",
        value: function elements(arr) {
          var _this2 = this;

          arr.forEach(function (rules, i) {
            _this2._schema.path((0, utils$1.join)(i, _this2.name), rules);
          });
          return this;
        }
        /**
         * Registers all properties from the given object as nested properties
         *
         * @example
         * prop.properties({
         *   name: String,
         *   email: String
         * })
         *
         * @param {Object} props - properties with rules
         * @return {Property}
         */

      }, {
        key: "properties",
        value: function properties(props) {
          for (var _i2 = 0, _Object$entries = Object.entries(props); _i2 < _Object$entries.length; _i2++) {
            var _Object$entries$_i = _slicedToArray(_Object$entries[_i2], 2),
                prop = _Object$entries$_i[0],
                rule = _Object$entries$_i[1];

            this._schema.path((0, utils$1.join)(prop, this.name), rule);
          }

          return this;
        }
        /**
         * Proxy method for schema path. Makes chaining properties together easier.
         *
         * @example
         * schema
         *   .path('name').type(String).required()
         *   .path('email').type(String).required()
         *
         */

      }, {
        key: "path",
        value: function path() {
          var _this$_schema;

          return (_this$_schema = this._schema).path.apply(_this$_schema, arguments);
        }
        /**
         * Typecast given `value`
         *
         * @example
         * prop.type(String)
         * prop.typecast(123) // => '123'
         *
         * @param {Mixed} value - value to typecast
         * @return {Mixed}
         */

      }, {
        key: "typecast",
        value: function typecast(value) {
          var schema = this._schema;
          var type = this._type;
          if (!type) return value;

          if (typeof type == 'function') {
            type = type.name;
          }

          var cast = schema.typecasters[type] || schema.typecasters[type.toLowerCase()];

          if (typeof cast != 'function') {
            throw new Error("Typecasting failed: No typecaster defined for ".concat(type, "."));
          }

          return cast(value);
        }
        /**
         * Validate given `value`
         *
         * @example
         * prop.type(Number)
         * assert(prop.validate(2) == null)
         * assert(prop.validate('hello world') instanceof Error)
         *
         * @param {Mixed} value - value to validate
         * @param {Object} ctx - the object containing the value
         * @param {String} [path] - path of the value being validated
         * @return {ValidationError}
         */

      }, {
        key: "validate",
        value: function validate(value, ctx) {
          var path = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : this.name;
          var types = Object.keys(this.registry);

          for (var _i3 = 0, _types = types; _i3 < _types.length; _i3++) {
            var type = _types[_i3];

            var err = this._run(type, value, ctx, path);

            if (err) return err;
          }

          return null;
        }
        /**
         * Run validator of given `type`
         *
         * @param {String} type - type of validator
         * @param {Mixed} value - value to validate
         * @param {Object} ctx - the object containing the value
         * @param {String} path - path of the value being validated
         * @return {ValidationError}
         * @private
         */

      }, {
        key: "_run",
        value: function _run(type, value, ctx, path) {
          if (!this.registry[type]) return;
          var schema = this._schema;
          var _this$registry$type = this.registry[type],
              args = _this$registry$type.args,
              fn = _this$registry$type.fn;
          var validator = fn || schema.validators[type];
          var valid = validator.apply(void 0, [value, ctx].concat(_toConsumableArray(args), [path]));
          if (!valid) return this._error(type, ctx, args, path);
        }
        /**
         * Register validator
         *
         * @param {String} type - type of validator
         * @param {Array} args - argument to pass to validator
         * @param {Function} [fn] - custom validation function to call
         * @return {Property}
         * @private
         */

      }, {
        key: "_register",
        value: function _register(type, args, fn) {
          this.registry[type] = {
            args: args,
            fn: fn
          };
          return this;
        }
        /**
         * Create an error
         *
         * @param {String} type - type of validator
         * @param {Object} ctx - the object containing the value
         * @param {Array} args - arguments to pass
         * @param {String} path - path of the value being validated
         * @return {ValidationError}
         * @private
         */

      }, {
        key: "_error",
        value: function _error(type, ctx, args, path) {
          var schema = this._schema;
          var message = this.messages[type] || this.messages["default"] || schema.messages[type] || schema.messages["default"];

          if (typeof message == 'function') {
            message = message.apply(void 0, [path, ctx].concat(_toConsumableArray(args)));
          }

          return new _error2["default"](message, path);
        }
      }]);

      return Property;
    }();

    exports["default"] = Property;
    module.exports = exports.default;
    });

    var messages$1 = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports["default"] = void 0;

    /**
     * Default error messages.
     *
     * @private
     */
    var Messages = {
      // Type message
      type: function type(prop, ctx, _type) {
        if (typeof _type == 'function') {
          _type = _type.name;
        }

        return "".concat(prop, " must be of type ").concat(_type, ".");
      },
      // Required message
      required: function required(prop) {
        return "".concat(prop, " is required.");
      },
      // Match message
      match: function match(prop, ctx, regexp) {
        return "".concat(prop, " must match ").concat(regexp, ".");
      },
      // Length message
      length: function length(prop, ctx, len) {
        if (typeof len == 'number') {
          return "".concat(prop, " must have a length of ").concat(len, ".");
        }

        var min = len.min,
            max = len.max;

        if (min && max) {
          return "".concat(prop, " must have a length between ").concat(min, " and ").concat(max, ".");
        }

        if (max) {
          return "".concat(prop, " must have a maximum length of ").concat(max, ".");
        }

        if (min) {
          return "".concat(prop, " must have a minimum length of ").concat(min, ".");
        }
      },
      // Size message
      size: function size(prop, ctx, _size) {
        if (typeof _size == 'number') {
          return "".concat(prop, " must have a size of ").concat(_size, ".");
        }

        var min = _size.min,
            max = _size.max;

        if (min !== undefined && max !== undefined) {
          return "".concat(prop, " must be between ").concat(min, " and ").concat(max, ".");
        }

        if (max !== undefined) {
          return "".concat(prop, " must be less than ").concat(max, ".");
        }

        if (min !== undefined) {
          return "".concat(prop, " must be greater than ").concat(min, ".");
        }
      },
      // Enum message
      "enum": function _enum(prop, ctx, enums) {
        var copy = enums.slice();
        var last = copy.pop();
        return "".concat(prop, " must be either ").concat(copy.join(', '), " or ").concat(last, ".");
      },
      // Default message
      "default": function _default(prop) {
        return "Validation failed for ".concat(prop, ".");
      }
    };
    var _default2 = Messages;
    exports["default"] = _default2;
    module.exports = exports.default;
    });

    var validators = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports["default"] = void 0;

    var _componentType = _interopRequireDefault(componentType);

    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

    /**
     * Default validators.
     *
     * @private
     */
    var Validators = {
      /**
       * Validates presence.
       *
       * @param {Mixed} value - the value being validated
       * @param {Object} ctx - the object being validated
       * @param {Bolean} required
       * @return {Boolean}
       */
      required: function required(value, ctx, _required) {
        if (_required === false) return true;
        return value != null && value !== '';
      },

      /**
       * Validates type.
       *
       * @param {Mixed} value - the value being validated
       * @param {Object} ctx - the object being validated
       * @param {String|Function} name name of the type or a constructor
       * @return {Boolean}
       */
      type: function type(value, ctx, name) {
        if (value == null) return true;

        if (typeof name == 'function') {
          return value.constructor === name;
        }

        return (0, _componentType["default"])(value) === name;
      },

      /**
       * Validates length.
       *
       * @param {String} value the string being validated
       * @param {Object} ctx the object being validated
       * @param {Object|Number} rules object with .min and/or .max props or a number
       * @param {Number} [rules.min] - minimum length
       * @param {Number} [rules.max] - maximum length
       * @return {Boolean}
       */
      length: function length(value, ctx, len) {
        if (value == null) return true;

        if (typeof len == 'number') {
          return value.length === len;
        }

        var min = len.min,
            max = len.max;
        if (min && value.length < min) return false;
        if (max && value.length > max) return false;
        return true;
      },

      /**
       * Validates size.
       *
       * @param {Number} value the number being validated
       * @param {Object} ctx the object being validated
       * @param {Object|Number} size object with .min and/or .max props or a number
       * @param {String|Number} [size.min] - minimum size
       * @param {String|Number} [size.max] - maximum size
       * @return {Boolean}
       */
      size: function size(value, ctx, _size) {
        if (value == null) return true;

        if (typeof _size == 'number') {
          return value === _size;
        }

        var min = _size.min,
            max = _size.max;
        if (parseInt(min) != null && value < min) return false;
        if (parseInt(max) != null && value > max) return false;
        return true;
      },

      /**
       * Validates enums.
       *
       * @param {String} value the string being validated
       * @param {Object} ctx the object being validated
       * @param {Array} enums array with allowed values
       * @return {Boolean}
       */
      "enum": function _enum(value, ctx, enums) {
        if (value == null) return true;
        return enums.includes(value);
      },

      /**
       * Validates against given `regexp`.
       *
       * @param {String} value the string beign validated
       * @param {Object} ctx the object being validated
       * @param {RegExp} regexp the regexp to validate against
       * @return {Boolean}
       */
      match: function match(value, ctx, regexp) {
        if (value == null) return true;
        return regexp.test(value);
      }
    };
    var _default = Validators;
    exports["default"] = _default;
    module.exports = exports.default;
    });

    var schema = createCommonjsModule(function (module, exports) {

    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports["default"] = void 0;

    var _componentType = _interopRequireDefault(componentType);

    var _eivindfjeldstadDot = _interopRequireDefault(eivindfjeldstadDot);

    var _typecast = _interopRequireDefault(typecast_1);

    var _property = _interopRequireDefault(property);

    var _messages = _interopRequireDefault(messages$1);

    var _validators = _interopRequireDefault(validators);

    var _error = _interopRequireDefault(error);



    function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

    function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

    function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

    function _iterableToArrayLimit(arr, i) { if (!(Symbol.iterator in Object(arr) || Object.prototype.toString.call(arr) === "[object Arguments]")) { return; } var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

    function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

    function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

    /**
     * A Schema defines the structure that objects should be validated against.
     *
     * @example
     * const post = new Schema({
     *   title: {
     *     type: String,
     *     required: true,
     *     length: { min: 1, max: 255 }
     *   },
     *   content: {
     *     type: String,
     *     required: true
     *   },
     *   published: {
     *     type: Date,
     *     required: true
     *   },
     *   keywords: [{ type: String }]
     * })
     *
     * @example
     * const author = new Schema({
     *   name: {
     *     type: String,
     *     required: true
     *   },
     *   email: {
     *     type: String,
     *     required: true
     *   },
     *   posts: [post]
     * })
     *
     * @param {Object} [obj] - schema definition
     * @param {Object} [opts] - options
     * @param {Boolean} [opts.typecast=false] - typecast values before validation
     * @param {Boolean} [opts.strip=true] - strip properties not defined in the schema
     */
    var Schema =
    /*#__PURE__*/
    function () {
      function Schema() {
        var _this = this;

        var obj = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
        var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

        _classCallCheck(this, Schema);

        this.opts = opts;
        this.hooks = [];
        this.props = {};
        this.messages = Object.assign({}, _messages["default"]);
        this.validators = Object.assign({}, _validators["default"]);
        this.typecasters = Object.assign({}, _typecast["default"]);
        Object.keys(obj).forEach(function (k) {
          return _this.path(k, obj[k]);
        });
      }
      /**
       * Create or update `path` with given `rules`.
       *
       * @example
       * const schema = new Schema()
       * schema.path('name.first', { type: String })
       * schema.path('name.last').type(String).required()
       *
       * @param {String} path - full path using dot-notation
       * @param {Object|Array|String|Schema|Property} [rules] - rules to apply
       * @return {Property}
       */


      _createClass(Schema, [{
        key: "path",
        value: function path(_path, rules) {
          var _this2 = this;

          var parts = _path.split('.');

          var suffix = parts.pop();
          var prefix = parts.join('.'); // Make sure full path is created

          if (prefix) {
            this.path(prefix);
          } // Array index placeholder


          if (suffix === '$') {
            this.path(prefix).type(Array);
          } // Nested schema


          if (rules instanceof Schema) {
            rules.hook(function (k, v) {
              return _this2.path((0, utils$1.join)(k, _path), v);
            });
            return this.path(_path, rules.props);
          } // Return early when given a `Property`


          if (rules instanceof _property["default"]) {
            this.props[_path] = rules; // Notify parents if mounted

            this.propagate(_path, rules);
            return rules;
          }

          var prop = this.props[_path] || new _property["default"](_path, this);
          this.props[_path] = prop; // Notify parents if mounted

          this.propagate(_path, prop); // No rules?

          if (!rules) return prop; // type shorthand
          // `{ name: String }`

          if (typeof rules == 'string' || typeof rules == 'function') {
            prop.type(rules);
            return prop;
          } // Allow arrays to be passed implicitly:
          // `{ keywords: [String] }`
          // `{ keyVal: [[String, Number]] }`


          if (Array.isArray(rules)) {
            prop.type(Array);

            if (rules.length === 1) {
              prop.each(rules[0]);
            } else {
              prop.elements(rules);
            }

            return prop;
          }

          var nested = false; // Check for nested objects

          for (var key in rules) {
            if (!rules.hasOwnProperty(key)) continue;
            if (typeof prop[key] == 'function') continue;
            prop.type(Object);
            nested = true;
            break;
          }

          Object.keys(rules).forEach(function (key) {
            var rule = rules[key];

            if (nested) {
              return _this2.path((0, utils$1.join)(key, _path), rule);
            }

            prop[key](rule);
          });
          return prop;
        }
        /**
         * Typecast given `obj`.
         *
         * @param {Object} obj - the object to typecast
         * @return {Schema}
         * @private
         */

      }, {
        key: "typecast",
        value: function typecast(obj) {
          var _loop = function _loop() {
            var _Object$entries$_i = _slicedToArray(_Object$entries[_i], 2),
                path = _Object$entries$_i[0],
                prop = _Object$entries$_i[1];

            (0, utils$1.walk)(path, obj, function (key, value) {
              if (value == null) return;
              var cast = prop.typecast(value);
              if (cast === value) return;

              _eivindfjeldstadDot["default"].set(obj, key, cast);
            });
          };

          for (var _i = 0, _Object$entries = Object.entries(this.props); _i < _Object$entries.length; _i++) {
            _loop();
          }

          return this;
        }
        /**
         * Strip all keys not defined in the schema
         *
         * @param {Object} obj - the object to strip
         * @param {String} [prefix]
         * @return {Schema}
         * @private
         */

      }, {
        key: "strip",
        value: function strip(obj, prefix) {
          var _this3 = this;

          var type = (0, _componentType["default"])(obj);

          if (type === 'array') {
            obj.forEach(function (v, i) {
              return _this3.strip(v, (0, utils$1.join)('$', prefix));
            });
            return this;
          }

          if (type !== 'object') {
            return this;
          }

          for (var _i2 = 0, _Object$entries2 = Object.entries(obj); _i2 < _Object$entries2.length; _i2++) {
            var _Object$entries2$_i = _slicedToArray(_Object$entries2[_i2], 2),
                key = _Object$entries2$_i[0],
                val = _Object$entries2$_i[1];

            var path = (0, utils$1.join)(key, prefix);

            if (!this.props[path]) {
              delete obj[key];
              continue;
            }

            this.strip(val, path);
          }

          return this;
        }
        /**
         * Validate given `obj`.
         *
         * @example
         * const schema = new Schema({ name: { required: true }})
         * const errors = schema.validate({})
         * assert(errors.length == 1)
         * assert(errors[0].message == 'name is required')
         * assert(errors[0].path == 'name')
         *
         * @param {Object} obj - the object to validate
         * @param {Object} [opts] - options, see [Schema](#schema-1)
         * @return {Array}
         */

      }, {
        key: "validate",
        value: function validate(obj) {
          var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
          opts = Object.assign(this.opts, opts);
          var errors = [];

          if (opts.typecast) {
            this.typecast(obj);
          }

          if (opts.strip !== false) {
            this.strip(obj);
          }

          var _loop2 = function _loop2() {
            var _Object$entries3$_i = _slicedToArray(_Object$entries3[_i3], 2),
                path = _Object$entries3$_i[0],
                prop = _Object$entries3$_i[1];

            (0, utils$1.walk)(path, obj, function (key, value) {
              var err = prop.validate(value, obj, key);
              if (err) errors.push(err);
            });
          };

          for (var _i3 = 0, _Object$entries3 = Object.entries(this.props); _i3 < _Object$entries3.length; _i3++) {
            _loop2();
          }

          return errors;
        }
        /**
         * Assert that given `obj` is valid.
         *
         * @example
         * const schema = new Schema({ name: String })
         * schema.assert({ name: 1 }) // Throws an error
         *
         * @param {Object} obj
         * @param {Object} [opts]
         */

      }, {
        key: "assert",
        value: function assert(obj, opts) {
          var _this$validate = this.validate(obj, opts),
              _this$validate2 = _slicedToArray(_this$validate, 1),
              err = _this$validate2[0];

          if (err) throw err;
        }
        /**
         * Override default error messages.
         *
         * @example
         * const hex = (val) => /^0x[0-9a-f]+$/.test(val)
         * schema.path('some.path').use({ hex })
         * schema.message('hex', path => `${path} must be hexadecimal`)
         *
         * @example
         * schema.message({ hex: path => `${path} must be hexadecimal` })
         *
         * @param {String|Object} name - name of the validator or an object with name-message pairs
         * @param {String|Function} [message] - the message or message generator to use
         * @return {Schema}
         */

      }, {
        key: "message",
        value: function message(name, _message) {
          (0, utils$1.assign)(name, _message, this.messages);
          return this;
        }
        /**
         * Override default validators.
         *
         * @example
         * schema.validator('required', val => val != null)
         *
         * @example
         * schema.validator({ required: val => val != null })
         *
         * @param {String|Object} name - name of the validator or an object with name-function pairs
         * @param {Function} [fn] - the function to use
         * @return {Schema}
         */

      }, {
        key: "validator",
        value: function validator(name, fn) {
          (0, utils$1.assign)(name, fn, this.validators);
          return this;
        }
        /**
         * Override default typecasters.
         *
         * @example
         * schema.typecaster('SomeClass', val => new SomeClass(val))
         *
         * @example
         * schema.typecaster({ SomeClass: val => new SomeClass(val) })
         *
         * @param {String|Object} name - name of the validator or an object with name-function pairs
         * @param {Function} [fn] - the function to use
         * @return {Schema}
         */

      }, {
        key: "typecaster",
        value: function typecaster(name, fn) {
          (0, utils$1.assign)(name, fn, this.typecasters);
          return this;
        }
        /**
         * Accepts a function that is called whenever new props are added.
         *
         * @param {Function} fn - the function to call
         * @return {Schema}
         * @private
         */

      }, {
        key: "hook",
        value: function hook(fn) {
          this.hooks.push(fn);
          return this;
        }
        /**
         * Notify all subscribers that a property has been added.
         *
         * @param {String} path - the path of the property
         * @param {Property} prop - the new property
         * @return {Schema}
         * @private
         */

      }, {
        key: "propagate",
        value: function propagate(path, prop) {
          this.hooks.forEach(function (fn) {
            return fn(path, prop);
          });
          return this;
        }
      }]);

      return Schema;
    }(); // Export ValidationError


    exports["default"] = Schema;
    Schema.ValidationError = _error["default"];
    module.exports = exports.default;
    });

    var Schema = /*@__PURE__*/getDefaultExportFromCjs(schema);

    const configSchema = new Schema({
      data: [
        {
          name: { type: String, required: true },
          type: { type: String, required: true },
          size: { type: Number },
          symmetry: { type: String, length: { min: 1, max: 2 }, required: true },
          displayName: { type: String, required: false },
          uri: { type: String, required: true },
        },
      ],
    });

    const validateConfig = (config) => {
      return configSchema.validate({ data: config });
    };

    /* src\TileSettings\components\TiledataRow.svelte generated by Svelte v3.31.2 */
    const file$6 = "src\\TileSettings\\components\\TiledataRow.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i];
    	return child_ctx;
    }

    // (36:8) {#each symmetryList as variant}
    function create_each_block$2(ctx) {
    	let a;
    	let t0_value = /*variant*/ ctx[6] + "";
    	let t0;
    	let t1;
    	let mounted;
    	let dispose;

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[5](/*variant*/ ctx[6]);
    	}

    	const block = {
    		c: function create() {
    			a = element("a");
    			t0 = text(t0_value);
    			t1 = space();
    			attr_dev(a, "href", "#");
    			attr_dev(a, "class", "dropdown-item");
    			add_location(a, file$6, 36, 10, 1165);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			append_dev(a, t0);
    			append_dev(a, t1);

    			if (!mounted) {
    				dispose = listen_dev(a, "click", click_handler_1, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(a);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(36:8) {#each symmetryList as variant}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let div5;
    	let img;
    	let img_src_value;
    	let img_alt_value;
    	let t0;
    	let div0;
    	let t1_value = (/*data*/ ctx[0].displayName || /*data*/ ctx[0].name) + "";
    	let t1;
    	let t2;
    	let div4;
    	let div1;
    	let button;
    	let span0;

    	let t3_value = (/*data*/ ctx[0].symmetry !== -1
    	? /*data*/ ctx[0].symmetry
    	: "none") + "";

    	let t3;
    	let t4;
    	let span1;
    	let i;
    	let t5;
    	let div3;
    	let div2;
    	let div4_class_value;
    	let mounted;
    	let dispose;
    	let each_value = /*symmetryList*/ ctx[3];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$2(get_each_context$2(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			div5 = element("div");
    			img = element("img");
    			t0 = space();
    			div0 = element("div");
    			t1 = text(t1_value);
    			t2 = space();
    			div4 = element("div");
    			div1 = element("div");
    			button = element("button");
    			span0 = element("span");
    			t3 = text(t3_value);
    			t4 = space();
    			span1 = element("span");
    			i = element("i");
    			t5 = space();
    			div3 = element("div");
    			div2 = element("div");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			if (img.src !== (img_src_value = uriToImage(/*data*/ ctx[0].type, /*data*/ ctx[0].uri))) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = /*data*/ ctx[0].name);
    			attr_dev(img, "class", "svelte-1ibdfe0");
    			add_location(img, file$6, 16, 2, 378);
    			attr_dev(div0, "class", "nameContainer svelte-1ibdfe0");
    			add_location(div0, file$6, 17, 2, 443);
    			add_location(span0, file$6, 27, 8, 804);
    			attr_dev(i, "class", "fas fa-angle-down");
    			attr_dev(i, "aria-hidden", "true");
    			add_location(i, file$6, 29, 10, 914);
    			attr_dev(span1, "class", "icon is-small");
    			add_location(span1, file$6, 28, 8, 874);
    			attr_dev(button, "class", "button symmetryButton svelte-1ibdfe0");
    			attr_dev(button, "aria-haspopup", "true");
    			attr_dev(button, "aria-controls", "dropdown-menu");
    			add_location(button, file$6, 21, 6, 613);
    			attr_dev(div1, "class", "dropdown-trigger");
    			add_location(div1, file$6, 20, 4, 575);
    			attr_dev(div2, "class", "dropdown-content");
    			add_location(div2, file$6, 34, 6, 1082);
    			attr_dev(div3, "class", "dropdown-menu");
    			attr_dev(div3, "id", "dropdown-menu");
    			attr_dev(div3, "role", "menu");
    			add_location(div3, file$6, 33, 4, 1016);
    			attr_dev(div4, "class", div4_class_value = "dropdown " + (/*dropdownOpen*/ ctx[1] ? "is-active" : "") + " svelte-1ibdfe0");
    			add_location(div4, file$6, 19, 2, 513);
    			attr_dev(div5, "class", "row container svelte-1ibdfe0");
    			add_location(div5, file$6, 15, 0, 347);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div5, anchor);
    			append_dev(div5, img);
    			append_dev(div5, t0);
    			append_dev(div5, div0);
    			append_dev(div0, t1);
    			append_dev(div5, t2);
    			append_dev(div5, div4);
    			append_dev(div4, div1);
    			append_dev(div1, button);
    			append_dev(button, span0);
    			append_dev(span0, t3);
    			append_dev(button, t4);
    			append_dev(button, span1);
    			append_dev(span1, i);
    			append_dev(div4, t5);
    			append_dev(div4, div3);
    			append_dev(div3, div2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(div2, null);
    			}

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[4], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*data*/ 1 && img.src !== (img_src_value = uriToImage(/*data*/ ctx[0].type, /*data*/ ctx[0].uri))) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*data*/ 1 && img_alt_value !== (img_alt_value = /*data*/ ctx[0].name)) {
    				attr_dev(img, "alt", img_alt_value);
    			}

    			if (dirty & /*data*/ 1 && t1_value !== (t1_value = (/*data*/ ctx[0].displayName || /*data*/ ctx[0].name) + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*data*/ 1 && t3_value !== (t3_value = (/*data*/ ctx[0].symmetry !== -1
    			? /*data*/ ctx[0].symmetry
    			: "none") + "")) set_data_dev(t3, t3_value);

    			if (dirty & /*dropdownOpen, data, symmetryList, dispatch*/ 15) {
    				each_value = /*symmetryList*/ ctx[3];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$2(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$2(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(div2, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*dropdownOpen*/ 2 && div4_class_value !== (div4_class_value = "dropdown " + (/*dropdownOpen*/ ctx[1] ? "is-active" : "") + " svelte-1ibdfe0")) {
    				attr_dev(div4, "class", div4_class_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div5);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("TiledataRow", slots, []);
    	const dispatch = createEventDispatcher();
    	let { data } = $$props;
    	const symmetryList = ["X", "T", "I", "L", "\\"];
    	let dropdownOpen = false;
    	const writable_props = ["data"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<TiledataRow> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => $$invalidate(1, dropdownOpen = !dropdownOpen);

    	const click_handler_1 = variant => {
    		$$invalidate(1, dropdownOpen = false);
    		const newData = { ...data };
    		newData.symmetry = variant;
    		dispatch("change", newData);
    	};

    	$$self.$$set = $$props => {
    		if ("data" in $$props) $$invalidate(0, data = $$props.data);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		uriToImage,
    		dispatch,
    		data,
    		symmetryList,
    		dropdownOpen
    	});

    	$$self.$inject_state = $$props => {
    		if ("data" in $$props) $$invalidate(0, data = $$props.data);
    		if ("dropdownOpen" in $$props) $$invalidate(1, dropdownOpen = $$props.dropdownOpen);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [data, dropdownOpen, dispatch, symmetryList, click_handler, click_handler_1];
    }

    class TiledataRow extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { data: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TiledataRow",
    			options,
    			id: create_fragment$6.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || {};

    		if (/*data*/ ctx[0] === undefined && !("data" in props)) {
    			console.warn("<TiledataRow> was created without expected prop 'data'");
    		}
    	}

    	get data() {
    		throw new Error("<TiledataRow>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<TiledataRow>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\TileSettings\TileDataModal.svelte generated by Svelte v3.31.2 */

    const { console: console_1$4 } = globals;
    const file$7 = "src\\TileSettings\\TileDataModal.svelte";

    function get_each_context$3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	child_ctx[13] = i;
    	return child_ctx;
    }

    // (135:8) {#each $tiles as tile, index}
    function create_each_block$3(ctx) {
    	let tiledatarow;
    	let current;

    	function change_handler(...args) {
    		return /*change_handler*/ ctx[9](/*index*/ ctx[13], ...args);
    	}

    	tiledatarow = new TiledataRow({
    			props: { data: /*tile*/ ctx[11] },
    			$$inline: true
    		});

    	tiledatarow.$on("change", change_handler);

    	const block = {
    		c: function create() {
    			create_component(tiledatarow.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(tiledatarow, target, anchor);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const tiledatarow_changes = {};
    			if (dirty & /*$tiles*/ 4) tiledatarow_changes.data = /*tile*/ ctx[11];
    			tiledatarow.$set(tiledatarow_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tiledatarow.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tiledatarow.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(tiledatarow, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$3.name,
    		type: "each",
    		source: "(135:8) {#each $tiles as tile, index}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let div7;
    	let div0;
    	let t0;
    	let div6;
    	let section2;
    	let div1;
    	let h3;
    	let t2;
    	let div5;
    	let h40;
    	let t4;
    	let div4;
    	let div2;
    	let label0;
    	let input0;
    	let t5;
    	let span2;
    	let span0;
    	let ion_icon0;
    	let t6;
    	let span1;
    	let t8;
    	let div3;
    	let label1;
    	let input1;
    	let t9;
    	let span5;
    	let span3;
    	let ion_icon1;
    	let t10;
    	let span4;
    	let t12;
    	let button0;
    	let t14;
    	let button1;
    	let t16;
    	let section0;
    	let h41;
    	let t18;
    	let t19;
    	let section1;
    	let h42;
    	let t21;
    	let pre;
    	let t22_value = JSON.stringify(/*$tiles*/ ctx[2], null, 2) + "";
    	let t22;
    	let t23;
    	let button2;
    	let div7_class_value;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value = /*$tiles*/ ctx[2];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$3(get_each_context$3(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			div7 = element("div");
    			div0 = element("div");
    			t0 = space();
    			div6 = element("div");
    			section2 = element("section");
    			div1 = element("div");
    			h3 = element("h3");
    			h3.textContent = "edit palette";
    			t2 = space();
    			div5 = element("div");
    			h40 = element("h4");
    			h40.textContent = "tiledata";
    			t4 = space();
    			div4 = element("div");
    			div2 = element("div");
    			label0 = element("label");
    			input0 = element("input");
    			t5 = space();
    			span2 = element("span");
    			span0 = element("span");
    			ion_icon0 = element("ion-icon");
    			t6 = space();
    			span1 = element("span");
    			span1.textContent = "upload images";
    			t8 = space();
    			div3 = element("div");
    			label1 = element("label");
    			input1 = element("input");
    			t9 = space();
    			span5 = element("span");
    			span3 = element("span");
    			ion_icon1 = element("ion-icon");
    			t10 = space();
    			span4 = element("span");
    			span4.textContent = "upload config";
    			t12 = space();
    			button0 = element("button");
    			button0.textContent = "download config";
    			t14 = space();
    			button1 = element("button");
    			button1.textContent = "clear config";
    			t16 = space();
    			section0 = element("section");
    			h41 = element("h4");
    			h41.textContent = "tiles";
    			t18 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t19 = space();
    			section1 = element("section");
    			h42 = element("h4");
    			h42.textContent = "raw data";
    			t21 = space();
    			pre = element("pre");
    			t22 = text(t22_value);
    			t23 = space();
    			button2 = element("button");
    			attr_dev(div0, "class", "modal-background");
    			add_location(div0, file$7, 76, 2, 1973);
    			attr_dev(h3, "class", "title is-3");
    			add_location(h3, file$7, 80, 8, 2119);
    			attr_dev(div1, "class", "title-container svelte-1cy38tb");
    			add_location(div1, file$7, 79, 6, 2080);
    			attr_dev(h40, "class", "title is-4");
    			add_location(h40, file$7, 83, 8, 2212);
    			attr_dev(input0, "class", "file-input ");
    			attr_dev(input0, "type", "file");
    			attr_dev(input0, "name", "resume");
    			attr_dev(input0, "webkitdirectory", "");
    			attr_dev(input0, "mozdirectory", "");
    			add_location(input0, file$7, 87, 14, 2388);
    			set_custom_element_data(ion_icon0, "name", "arrow-up-outline");
    			add_location(ion_icon0, file$7, 97, 18, 2701);
    			attr_dev(span0, "class", "file-icon");
    			add_location(span0, file$7, 96, 16, 2657);
    			attr_dev(span1, "class", "file-label");
    			add_location(span1, file$7, 99, 16, 2780);
    			attr_dev(span2, "class", "file-cta");
    			add_location(span2, file$7, 95, 14, 2616);
    			attr_dev(label0, "class", "file-label");
    			add_location(label0, file$7, 86, 12, 2346);
    			attr_dev(div2, "class", "file withMargin svelte-1cy38tb");
    			add_location(div2, file$7, 85, 10, 2303);
    			attr_dev(input1, "class", "file-input ");
    			attr_dev(input1, "type", "file");
    			attr_dev(input1, "name", "resume");
    			add_location(input1, file$7, 106, 14, 2989);
    			set_custom_element_data(ion_icon1, "name", "arrow-up-outline");
    			add_location(ion_icon1, file$7, 114, 18, 3258);
    			attr_dev(span3, "class", "file-icon");
    			add_location(span3, file$7, 113, 16, 3214);
    			attr_dev(span4, "class", "file-label");
    			add_location(span4, file$7, 116, 16, 3337);
    			attr_dev(span5, "class", "file-cta");
    			add_location(span5, file$7, 112, 14, 3173);
    			attr_dev(label1, "class", "file-label");
    			add_location(label1, file$7, 105, 12, 2947);
    			attr_dev(div3, "class", "file withMargin svelte-1cy38tb");
    			add_location(div3, file$7, 104, 10, 2904);
    			attr_dev(button0, "class", "button is-outlined is-success withMargin svelte-1cy38tb");
    			add_location(button0, file$7, 121, 10, 3461);
    			attr_dev(button1, "class", "button is-outlined is-danger withMargin svelte-1cy38tb");
    			add_location(button1, file$7, 126, 10, 3620);
    			attr_dev(div4, "class", "row buttonContainer svelte-1cy38tb");
    			add_location(div4, file$7, 84, 8, 2258);
    			attr_dev(div5, "class", "section");
    			add_location(div5, file$7, 82, 6, 2181);
    			attr_dev(h41, "class", "title is-4");
    			add_location(h41, file$7, 133, 8, 3831);
    			attr_dev(section0, "class", "section");
    			add_location(section0, file$7, 132, 6, 3796);
    			attr_dev(h42, "class", "title is-4");
    			add_location(h42, file$7, 143, 8, 4106);
    			attr_dev(pre, "class", "codeContainer svelte-1cy38tb");
    			add_location(pre, file$7, 144, 8, 4152);
    			attr_dev(section1, "class", "section");
    			add_location(section1, file$7, 142, 6, 4071);
    			attr_dev(section2, "class", "modal-card-body");
    			add_location(section2, file$7, 78, 4, 2039);
    			attr_dev(div6, "class", "modal-card svelte-1cy38tb");
    			add_location(div6, file$7, 77, 2, 2009);
    			attr_dev(button2, "class", "modal-close is-large");
    			attr_dev(button2, "aria-label", "close");
    			add_location(button2, file$7, 148, 2, 4266);
    			attr_dev(div7, "class", div7_class_value = "modal " + (/*$modalOpen*/ ctx[3] ? "is-active" : ""));
    			add_location(div7, file$7, 75, 0, 1918);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div7, anchor);
    			append_dev(div7, div0);
    			append_dev(div7, t0);
    			append_dev(div7, div6);
    			append_dev(div6, section2);
    			append_dev(section2, div1);
    			append_dev(div1, h3);
    			append_dev(section2, t2);
    			append_dev(section2, div5);
    			append_dev(div5, h40);
    			append_dev(div5, t4);
    			append_dev(div5, div4);
    			append_dev(div4, div2);
    			append_dev(div2, label0);
    			append_dev(label0, input0);
    			append_dev(label0, t5);
    			append_dev(label0, span2);
    			append_dev(span2, span0);
    			append_dev(span0, ion_icon0);
    			append_dev(span2, t6);
    			append_dev(span2, span1);
    			append_dev(div4, t8);
    			append_dev(div4, div3);
    			append_dev(div3, label1);
    			append_dev(label1, input1);
    			append_dev(label1, t9);
    			append_dev(label1, span5);
    			append_dev(span5, span3);
    			append_dev(span3, ion_icon1);
    			append_dev(span5, t10);
    			append_dev(span5, span4);
    			append_dev(div4, t12);
    			append_dev(div4, button0);
    			append_dev(div4, t14);
    			append_dev(div4, button1);
    			append_dev(section2, t16);
    			append_dev(section2, section0);
    			append_dev(section0, h41);
    			append_dev(section0, t18);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(section0, null);
    			}

    			append_dev(section2, t19);
    			append_dev(section2, section1);
    			append_dev(section1, h42);
    			append_dev(section1, t21);
    			append_dev(section1, pre);
    			append_dev(pre, t22);
    			append_dev(div7, t23);
    			append_dev(div7, button2);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "change", /*input0_change_handler*/ ctx[7]),
    					listen_dev(input1, "change", /*input1_change_handler*/ ctx[8]),
    					listen_dev(button0, "click", /*downloadConfig*/ ctx[6], false, false, false),
    					listen_dev(button1, "click", /*clearConfig*/ ctx[5], false, false, false),
    					listen_dev(button2, "click", /*click_handler*/ ctx[10], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$tiles, updateTile*/ 20) {
    				each_value = /*$tiles*/ ctx[2];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$3(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$3(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(section0, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if ((!current || dirty & /*$tiles*/ 4) && t22_value !== (t22_value = JSON.stringify(/*$tiles*/ ctx[2], null, 2) + "")) set_data_dev(t22, t22_value);

    			if (!current || dirty & /*$modalOpen*/ 8 && div7_class_value !== (div7_class_value = "modal " + (/*$modalOpen*/ ctx[3] ? "is-active" : ""))) {
    				attr_dev(div7, "class", div7_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div7);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let $tiles;
    	let $modalOpen;
    	validate_store(tiles, "tiles");
    	component_subscribe($$self, tiles, $$value => $$invalidate(2, $tiles = $$value));
    	validate_store(modalOpen, "modalOpen");
    	component_subscribe($$self, modalOpen, $$value => $$invalidate(3, $modalOpen = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("TileDataModal", slots, []);
    	let files = [];
    	let configFileUpload;

    	const updateTile = (index, newTile) => {
    		const newTiles = [...$tiles];
    		newTiles[index] = newTile;
    		tiles.set(newTiles);
    		console.log($tiles);
    	};

    	const clearConfig = () => {
    		if (confirm("do you really want to delete the config?")) {
    			tiles.set([]);
    		}
    	};

    	const downloadConfig = () => {
    		const blob = new Blob([JSON.stringify($tiles)], { type: "text/plain;charset=utf-8" });
    		console.log("data", blob);
    		FileSaver_min.saveAs(blob, "config.json");
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$4.warn(`<TileDataModal> was created with unknown prop '${key}'`);
    	});

    	function input0_change_handler() {
    		files = this.files;
    		$$invalidate(0, files);
    	}

    	function input1_change_handler() {
    		configFileUpload = this.files;
    		$$invalidate(1, configFileUpload);
    	}

    	const change_handler = (index, e) => updateTile(index, e.detail);

    	const click_handler = () => {
    		modalOpen.set(false);
    	};

    	$$self.$capture_state = () => ({
    		saveAs: FileSaver_min.saveAs,
    		imgToDataURI,
    		validateConfig,
    		modalOpen,
    		tiles,
    		TiledataRow,
    		files,
    		configFileUpload,
    		updateTile,
    		clearConfig,
    		downloadConfig,
    		$tiles,
    		$modalOpen
    	});

    	$$self.$inject_state = $$props => {
    		if ("files" in $$props) $$invalidate(0, files = $$props.files);
    		if ("configFileUpload" in $$props) $$invalidate(1, configFileUpload = $$props.configFileUpload);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*files*/ 1) {
    			 if (files.length > 0) {
    				console.log(files);

    				Promise.all(Array.from(files).filter(elem => elem.type === "image/jpeg" || elem.type === "image/png").map(async elem => {
    					const { name, type, size } = elem;
    					const uri = await imgToDataURI(elem);

    					return {
    						name,
    						type,
    						size,
    						symmetry: "0",
    						displayName: name.split(".")[0],
    						uri
    					};
    				})).then(tilesUploaded => {
    					console.log(tilesUploaded);
    					tiles.set(tilesUploaded);
    				});
    			}
    		}

    		if ($$self.$$.dirty & /*configFileUpload*/ 2) {
    			 if (configFileUpload) {
    				const fr = new FileReader();

    				fr.onload = function (e) {
    					const result = e.target.result;
    					console.log(result);
    					const data = JSON.parse(result);
    					console.log(data);
    					const errors = validateConfig(data);
    					console.log(errors);

    					if (errors.length === 0) {
    						tiles.set(data);
    					}
    				};

    				fr.readAsText(configFileUpload.item(0));
    			}
    		}
    	};

    	return [
    		files,
    		configFileUpload,
    		$tiles,
    		$modalOpen,
    		updateTile,
    		clearConfig,
    		downloadConfig,
    		input0_change_handler,
    		input1_change_handler,
    		change_handler,
    		click_handler
    	];
    }

    class TileDataModal extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TileDataModal",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    const cleanUpTiles = (tiles, grid) => {
      const indexToName = (index) => {
        return tiles[index].name;
      };

      // filter out empty tiles
      const tilesToProcess = grid.filter((tile) => tile.tex > -1);

      // group all tiles of same type
      const sortedByType = tiles
        .map((tileType, i) => {
          return {
            ...tileType,
            occurences: tilesToProcess.filter((gridTile) => gridTile.tex === i),
          };
        })
        .filter((tileType) => !!tileType.occurences.length);

      // get all neighbors for every tyle type
      const relations = sortedByType
        .map((tileType) => {
          const relationsForTileType = tileType.occurences.map((currentTile) => {
            const neighbors = [];

            // get tile next to current tile
            const right = tilesToProcess.find(
              (otherTile) =>
                otherTile.x === currentTile.x + 1 && otherTile.y === currentTile.y
            );
            if (right) {
              neighbors.push({
                left: `${indexToName(currentTile.tex)} ${currentTile.rotation}`,
                right: `${indexToName(right.tex)} ${right.rotation}`,
              });
            }
            // get tile beneath current tile
            const beneath = tilesToProcess.find(
              (otherTile) =>
                otherTile.y === currentTile.y + 1 && otherTile.x === currentTile.x
            );

            // to stay consistent just rotate by 90° and also list as pair of "left / right"
            if (beneath) {
              neighbors.push({
                left: `${indexToName(currentTile.tex)} ${
              (currentTile.rotation + 1) % 4
            }`,
                right: `${indexToName(beneath.tex)} ${(beneath.rotation + 1) % 4}`,
              });
            }

            return neighbors.filter((neighbor) => !!neighbor);
          });
          return relationsForTileType;
        })
        .filter((type) => type.length > 0);

      // flatten all types, so only relations stay. also remove empty remains
      console.log("relations", relations);
      const relationsFlattened = relations
        .flat()
        .filter((elem) => elem.length > 0)
        .flat();
      console.log("relationsFlattened", relationsFlattened);

      // get rid of duplicates (lazy implementation)
      if (relationsFlattened.length > 0) {
        const relationsCleaned = relationsFlattened
          .map((elem) => JSON.stringify(elem))
          .reduce(function (a, b) {
            if (a.indexOf(b) < 0) a.push(b);
            return a;
          }, [])
          .map((elem) => JSON.parse(elem));

        return relationsCleaned;
      }

      return relationsFlattened;
    };

    var img = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAHCAIAAABLMMCEAAAACXBIWXMAAAsSAAALEgHS3X78AAAAM0lEQVQImWOccUQ0495lBiQwQ0mX8f9JPgYMwPj/E6YgAxMWMVyiLAzXsZjLMvM3O6YbAL+hDchoiFysAAAAAElFTkSuQmCC";

    var img$1 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAHCAIAAABLMMCEAAAACXBIWXMAAAsSAAALEgHS3X78AAAAFElEQVQImWOccUSUAQMwYQrRXRQA4GsBf+NZCRoAAAAASUVORK5CYII=";

    var img$2 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAHCAIAAABLMMCEAAAACXBIWXMAAAsSAAALEgHS3X78AAAAG0lEQVQImWOccUQ0495lBiQwQ0mXiQEboK8oAJIABH/orAscAAAAAElFTkSuQmCC";

    var img$3 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAHCAIAAABLMMCEAAAACXBIWXMAAAsSAAALEgHS3X78AAAAL0lEQVQImWOccUQ0495lBiQwQ0mXiQEDZNy7jEWUgYEBt+gMJV3satEkWJCthrMB33UJTxrFxY8AAAAASUVORK5CYII=";

    var img$4 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAHCAIAAABLMMCEAAAACXBIWXMAAAsSAAALEgHS3X78AAAAJElEQVQImWOccUSUgYEhXe81AwMDAwPDzEuiDAwMTAzYAH1FAYkJBH9MGQTZAAAAAElFTkSuQmCC";

    var img$5 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAHCAIAAABLMMCEAAAACXBIWXMAAAsSAAALEgHS3X78AAAAM0lEQVQImWOccUSUgYEhXe81AwMDAwPDzEuiDAwMTAzYAAsaH6IJu1omZOOwmIAsgd0EAJ7QCQOm1vQdAAAAAElFTkSuQmCC";

    var img$6 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAHCAIAAABLMMCEAAAACXBIWXMAAAsSAAALEgHS3X78AAAALklEQVQImWOccUSUAQMwYQoxMDAw/v+ERRS7WuyiLDMviTIwMKTrvYbwIVzsagFRIgfx3PGauAAAAABJRU5ErkJggg==";

    var img$7 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAHCAIAAABLMMCEAAAACXBIWXMAAAsSAAALEgHS3X78AAAAJ0lEQVQImWNgYGBgYGCor6+HkwwMDIzIHAhobGxkRBOilloGrG4AAHP2EfRKAuMzAAAAAElFTkSuQmCC";

    var img$8 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAHCAIAAABLMMCEAAAACXBIWXMAAAsSAAALEgHS3X78AAAANUlEQVQImWOccUQ0w+Z1fX09AwMDAwNDY2PjjCOijDOOiD7fncWABCRdpzFB5OFCEDat1AIAWiQd4Xc2GiMAAAAASUVORK5CYII=";

    var img$9 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAHCAIAAABLMMCEAAAACXBIWXMAAAsSAAALEgHS3X78AAAARklEQVQImWOccUT0+e4sBiQg6TqNkWHRC4Y4ifr6eohQY2Mjw6IXTAzYACPDohf1d6cjCzUqZzJBdcGFGhsZGBhwmIDVDQD5FxcHuCuhbwAAAABJRU5ErkJggg==";

    var img$a = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAAHCAIAAABLMMCEAAAACXBIWXMAAAsSAAALEgHS3X78AAAAR0lEQVQImWOccUQ0w+Z1fX09AwMDAwNDY2PjjCOijDOOiD7fncWABCRdpzH+/8TAyMeArPb/JwYmBmwAuyh2c5kgZsGFIGwAzicaVbj/psYAAAAASUVORK5CYII=";

    var tiles$1 = [
      { data: img, name: "bridge", symmetry: "I" },
      { data: img$1, name: "ground", symmetry: "X" },
      { data: img$2, name: "river", symmetry: "I" },
      { data: img$3, name: "riverturn", symmetry: "L" },
      { data: img$4, name: "road", symmetry: "I" },
      { data: img$5, name: "roadturn", symmetry: "L" },
      { data: img$6, name: "t", symmetry: "T" },
      { data: img$7, name: "tower", symmetry: "X" },
      { data: img$8, name: "wall", symmetry: "I" },
      { data: img$9, name: "wallriver", symmetry: "I" },
      { data: img$a, name: "wallroad", symmetry: "I" },
    ];

    /* src\App.svelte generated by Svelte v3.31.2 */

    const { console: console_1$5 } = globals;
    const file$8 = "src\\App.svelte";

    function create_fragment$8(ctx) {
    	let div4;
    	let navbar;
    	let t0;
    	let div3;
    	let div2;
    	let div0;
    	let palette;
    	let updating_selectedIndex;
    	let t1;
    	let div1;
    	let canvas;
    	let t2;
    	let tiledatamodal;
    	let current;
    	navbar = new Navbar({ $$inline: true });

    	function palette_selectedIndex_binding(value) {
    		/*palette_selectedIndex_binding*/ ctx[4].call(null, value);
    	}

    	let palette_props = {};

    	if (/*selectedIndex*/ ctx[0] !== void 0) {
    		palette_props.selectedIndex = /*selectedIndex*/ ctx[0];
    	}

    	palette = new Palette({ props: palette_props, $$inline: true });
    	binding_callbacks.push(() => bind(palette, "selectedIndex", palette_selectedIndex_binding));

    	canvas = new Canvas({
    			props: { selectedIndex: /*selectedIndex*/ ctx[0] },
    			$$inline: true
    		});

    	canvas.$on("submitGrid", /*handleSubmit*/ ctx[3]);
    	canvas.$on("changedGrid", /*changedGrid_handler*/ ctx[5]);
    	canvas.$on("downloadConfig", /*downloadConfig_handler*/ ctx[6]);
    	tiledatamodal = new TileDataModal({ $$inline: true });

    	const block = {
    		c: function create() {
    			div4 = element("div");
    			create_component(navbar.$$.fragment);
    			t0 = space();
    			div3 = element("div");
    			div2 = element("div");
    			div0 = element("div");
    			create_component(palette.$$.fragment);
    			t1 = space();
    			div1 = element("div");
    			create_component(canvas.$$.fragment);
    			t2 = space();
    			create_component(tiledatamodal.$$.fragment);
    			attr_dev(div0, "class", "column is-narrow");
    			set_style(div0, "height", "100%");
    			add_location(div0, file$8, 48, 6, 1234);
    			attr_dev(div1, "class", "column");
    			set_style(div1, "height", "100%");
    			add_location(div1, file$8, 51, 6, 1344);
    			attr_dev(div2, "class", "columns");
    			set_style(div2, "height", "100%");
    			add_location(div2, file$8, 47, 4, 1185);
    			attr_dev(div3, "class", "content svelte-19xrhst");
    			add_location(div3, file$8, 46, 2, 1159);
    			attr_dev(div4, "class", "maincontainer svelte-19xrhst");
    			add_location(div4, file$8, 43, 0, 1115);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			mount_component(navbar, div4, null);
    			append_dev(div4, t0);
    			append_dev(div4, div3);
    			append_dev(div3, div2);
    			append_dev(div2, div0);
    			mount_component(palette, div0, null);
    			append_dev(div2, t1);
    			append_dev(div2, div1);
    			mount_component(canvas, div1, null);
    			insert_dev(target, t2, anchor);
    			mount_component(tiledatamodal, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			const palette_changes = {};

    			if (!updating_selectedIndex && dirty & /*selectedIndex*/ 1) {
    				updating_selectedIndex = true;
    				palette_changes.selectedIndex = /*selectedIndex*/ ctx[0];
    				add_flush_callback(() => updating_selectedIndex = false);
    			}

    			palette.$set(palette_changes);
    			const canvas_changes = {};
    			if (dirty & /*selectedIndex*/ 1) canvas_changes.selectedIndex = /*selectedIndex*/ ctx[0];
    			canvas.$set(canvas_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(navbar.$$.fragment, local);
    			transition_in(palette.$$.fragment, local);
    			transition_in(canvas.$$.fragment, local);
    			transition_in(tiledatamodal.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(navbar.$$.fragment, local);
    			transition_out(palette.$$.fragment, local);
    			transition_out(canvas.$$.fragment, local);
    			transition_out(tiledatamodal.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			destroy_component(navbar);
    			destroy_component(palette);
    			destroy_component(canvas);
    			if (detaching) detach_dev(t2);
    			destroy_component(tiledatamodal, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let selectedIndex;
    	let config = null;

    	const downloadFiles = async (tileData, neighborData) => {
    		const zip = new lib();
    		const dataToDownload = { tiles: tileData, neighbors: neighborData };
    		var blob = new Blob([JSON.stringify(dataToDownload)], { type: "text/plain;charset=utf-8" });
    		console.log("data", dataToDownload);
    		FileSaver_min.saveAs(blob, "tiledata.json");
    	};

    	const handleSubmit = ({ detail: tileData }) => {
    		console.log(tileData);
    		const { grid } = tileData;
    		const relations = cleanUpTiles(tiles$1, grid);
    		$$invalidate(1, config = relations);
    		console.log(relations);
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1$5.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function palette_selectedIndex_binding(value) {
    		selectedIndex = value;
    		$$invalidate(0, selectedIndex);
    	}

    	const changedGrid_handler = () => {
    		$$invalidate(1, config = null);
    	};

    	const downloadConfig_handler = () => {
    		downloadFiles(tiles$1, config);
    	};

    	$$self.$capture_state = () => ({
    		JSZip: lib,
    		saveAs: FileSaver_min.saveAs,
    		mode,
    		Navbar,
    		Palette,
    		Canvas,
    		TileDataModal,
    		cleanUpTiles,
    		tiles: tiles$1,
    		selectedIndex,
    		config,
    		downloadFiles,
    		handleSubmit
    	});

    	$$self.$inject_state = $$props => {
    		if ("selectedIndex" in $$props) $$invalidate(0, selectedIndex = $$props.selectedIndex);
    		if ("config" in $$props) $$invalidate(1, config = $$props.config);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		selectedIndex,
    		config,
    		downloadFiles,
    		handleSubmit,
    		palette_selectedIndex_binding,
    		changedGrid_handler,
    		downloadConfig_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
