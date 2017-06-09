
import { getAncestor, findFrameByName } from 'cross-domain-utils/src';
import base32 from 'hi-base32';
import { memoize, uniqueID, getDomain } from '../lib';
import { XCOMPONENT, WINDOW_REFERENCES, __XCOMPONENT__ } from '../constants';


function normalize(str) {
    return str && str.replace(/^[^a-z0-9A-Z]+|[^a-z0-9A-Z]+$/g, '').replace(/[^a-z0-9A-Z]+/g, '_');
}


/*  Build Child Window Name
    -----------------------

    Build a name for our child window. This should identify the following things to the child:

    - That the window was created by, and is owned by xcomponent
    - The name of the child's parent. This is so the child can identify which window created it, even when we do a
      renderTo, in which case the true parent may actually be a sibling frame in the window hierarchy

    We base64 encode the window name so IE doesn't die when it encounters any characters that it doesn't like.
*/

export function buildChildWindowName(name, version, options = {}) {

    options.id = uniqueID();
    options.domain = getDomain(window);

    let encodedName = normalize(name);
    let encodedVersion = normalize(version);
    let encodedOptions = base32.encode(JSON.stringify(options)).replace(/\=/g, '').toLowerCase();

    if (!encodedName) {
        throw new Error(`Invalid name: ${name} - must contain alphanumeric characters`);
    }

    if (!encodedVersion) {
        throw new Error(`Invalid version: ${version} - must contain alphanumeric characters`);
    }

    return [
        XCOMPONENT,
        encodedName,
        encodedVersion,
        encodedOptions
    ].join('__');
}


/*  Parse Window Name
    -----------------

    The inverse of buildChildWindowName. Base64 decodes and json parses the window name to get the original props
    passed down, including the parent name. Only accepts window names built by xcomponent
*/

export let getComponentMeta = memoize(() => {

    if (!window.name) {
        return;
    }

    let [ xcomp, name, version, encodedOptions ] = window.name.split('__');

    if (xcomp !== XCOMPONENT) {
        return;
    }

    let componentMeta;

    try {
        componentMeta = JSON.parse(base32.decode(encodedOptions.toUpperCase()));
    } catch (err) {
        return;
    }

    componentMeta.name = name;
    componentMeta.version = version.replace(/_/g, '.');

    return componentMeta;
});

export function getParentDomain() {
    return getComponentMeta().domain; // How does this work for renderTo..?
}


export let isXComponentWindow = memoize(() => {
    return Boolean(getComponentMeta());
});

/*  Get Parent Component Window
    ---------------------------

    Get the parent component window, which may be different from the actual parent window
*/

export let getParentComponentWindow = memoize(() => {

    let componentMeta = getComponentMeta();

    if (!componentMeta) {
        throw new Error(`Can not get parent component window - window not rendered by xcomponent`);
    }

    let parentWindow = getAncestor(window);

    if (!parentWindow) {
        throw new Error(`Can not find parent window`);
    }

    if (componentMeta.parent === WINDOW_REFERENCES.DIRECT_PARENT) {
        return parentWindow;

    } else if (componentMeta.parent === WINDOW_REFERENCES.PARENT_PARENT) {
        parentWindow = getAncestor(parentWindow);

        if (!parentWindow) {
            throw new Error(`Can not find parent component window`);
        }

        return parentWindow;
    }

    let parentFrame = findFrameByName(parentWindow, componentMeta.parent);

    if (!parentFrame) {
        throw new Error(`Can not find frame with name: ${componentMeta.parent}`);
    }

    return parentFrame;
});


export let getParentRenderWindow = memoize(() => {

    let componentMeta = getComponentMeta();

    if (!componentMeta) {
        throw new Error(`Can not get parent component window - window not rendered by xcomponent`);
    }

    let parentWindow = getAncestor(window);

    if (!parentWindow) {
        throw new Error(`Can not find parent window`);
    }

    if (componentMeta.renderParent === WINDOW_REFERENCES.DIRECT_PARENT) {
        return parentWindow;

    } else if (componentMeta.renderParent === WINDOW_REFERENCES.PARENT_PARENT) {
        parentWindow = getAncestor(parentWindow);

        if (!parentWindow) {
            throw new Error(`Can not find parent render window`);
        }

        return parentWindow;

    } else if (componentMeta.renderParent === WINDOW_REFERENCES.PARENT_UID) {

        parentWindow = getParentComponentWindow()[__XCOMPONENT__].windows[componentMeta.uid];

        if (!parentWindow) {
            throw new Error(`Can not find parent render window`);
        }

        return parentWindow;
    }

    throw new Error(`Unrecognized renderParent reference: ${componentMeta.renderParent}`);
});


/*  Get Position
    ------------

    Calculate the position for the popup

    This is either
    - Specified by the user
    - The center of the screen

    I'd love to do this with pure css, but alas... popup windows :(
*/

export function getPosition(options) {

    let width = options.width;
    let height = options.height;
    let left;
    let top;

    if (width) {
        if (window.outerWidth) {
            left = Math.round((window.outerWidth - width) / 2) + window.screenX;
        } else if (window.screen.width) {
            left = Math.round((window.screen.width - width) / 2);
        }
    }

    if (height) {
        if (window.outerHeight) {
            top = Math.round((window.outerHeight - height) / 2) + window.screenY;
        } else if (window.screen.height) {
            top = Math.round((window.screen.height - height) / 2);
        }
    }

    return {
        x: left,
        y: top
    };
}
