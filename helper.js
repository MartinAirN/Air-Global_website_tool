'use strict';

const path = require('path');

module.exports = class Helper {
    constructor() {}

    collectionLinkBuilder(pageurl, album, category, includeSubDirectories, hidden) {
        let output = pageurl;
        if (album || category || includeSubDirectories || hidden) {
            output += "?";
            if (album) {
                output += `album=${album}`;
                if (category || includeSubDirectories || hidden) {
                    output += "&";
                }
            }
            if (category) {
                output += 'category='
                if (category.indexOf('&') > -1) {
                    output+=this.replaceAll(category, '&', encodeURIComponent('&'));
                } else {
                    output += category;
                }
                if (includeSubDirectories || hidden) {
                    output += "&";
                }
            }
            if (includeSubDirectories) {
                output += `i=${includeSubDirectories}`;
                if (hidden) {
                    output += "&";
                }
            }
            if (hidden) {
                output += `h=${hidden}`;
            }
        }
        return output;
    }

    toPhoneLink(inputString) {
        return (inputString ? `tel:${this.replaceAll(this.replaceAll(inputString,'-', ''), ' ', '')}` : '');
    }

    toTitleText(inputString) {
        return this.replaceAll(this.capitalize(inputString), '_', ' ');
    }

    toBreadText(inputString) {
        return this.replaceAll(inputString.toUpperCase(), '_', ' ');
    }

    toBoolean(inputString) {
        if (inputString) {
            return (inputString === 'true');
        }
        return false;
    }

    capitalize(inputString) {
        return inputString.charAt(0).toUpperCase() + inputString.slice(1);
    }

    pathJoin(path1, path2) {
        return path.join(path1, path2);
    }

    replaceAll(inputString, replacee, replacer) {
        return inputString.split(replacee).join(replacer);
    }
}