try {
    const stack = require('./node_modules/@stackframe/stack/dist/index.js');
    console.log('Keys:', Object.keys(stack));
    if (stack.StackServerApp) {
        console.log('StackServerApp prototype:', Object.getOwnPropertyNames(stack.StackServerApp.prototype));
        const app = new stack.StackServerApp({ tokenStore: 'nextjs-cookie' });
        console.log('App keys:', Object.keys(app));
        console.log('App prototype keys:', Object.getOwnPropertyNames(Object.getPrototypeOf(app)));
    }
} catch (e) {
    console.error(e);
}
