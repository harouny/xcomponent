
window.MyLoginXComponent = xcomponent.create({

    // The html tag used to render my component

    tag: 'my-login-component',

    bridgeUrl: 'http://localhost:8082/demo/advanced/ie11-cross-domain-popup/bridge.htm',

    // The url that will be loaded in the iframe or popup, when someone includes my component on their page

    url: 'http://localhost:8082/demo/advanced/ie11-cross-domain-popup/login.htm',

    // Allow the component to be rendered as a popup

    contexts: {
        popup: true
    },

    dimensions: {
        width: '500px',
        height: '300px'
    },

    // The background overlay

    containerTemplate: xcomponent.containerTemplate
});
