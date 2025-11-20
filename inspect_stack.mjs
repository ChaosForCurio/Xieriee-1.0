import { StackServerApp } from '@stackframe/stack';

try {
    console.log('StackServerApp prototype keys:', Object.getOwnPropertyNames(StackServerApp.prototype));
    const app = new StackServerApp({ tokenStore: 'nextjs-cookie' });
    console.log('StackServerApp instance keys:', Object.keys(app));
    console.log('StackServerApp instance prototype keys:', Object.getOwnPropertyNames(Object.getPrototypeOf(app)));
} catch (e) {
    console.error(e);
}
