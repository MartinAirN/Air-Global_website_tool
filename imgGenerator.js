'use strict';

const imgPage = require('./img.js');

module.exports = class ImgGenerator {
    config = {};
    constructor(config) {
        this.config = config;
    }

    async generate(store) {
        this.generateImages(store, this.config.images.author).then(() => {
            console.log(`test 1`);
            this.generateImages(store, this.config.images.instagram).then(() => {
                console.log(`test 2`);
                this.generateImages(store, "album").then(() => {
                    console.log(`test 3`);
                    this.generateImages(store, this.config.images.hiddenAlbum).catch(e => {console.log(e);});
                    console.log(`test 4`);
                }).catch(e => {console.log(e);});
            }).catch(e => {console.log(e);});
        }).catch(e => {console.log(e);});
    }

    async generateImages(store, album) {
        let images = store.getImages(album, undefined, true);
        let keys = Object.keys(images);
        for (let i = 0; i < keys.length; i++) {
            this.generateThumbnail(images[keys[i]].id, store);
            this.generateImage(images[keys[i]].id, store);
        }
    }

    generateThumbnail(imageId, store) {
        let request = {};
        request.id = imageId;
        request.width = this.config.images.view.thumbnail.width;
        request.height = this.config.images.view.thumbnail.height;
	    var imagePage = new imgPage(request, this.config);
        imagePage.returnImage(undefined, store);
    }

    generateImage(imageId, store) {
        let request = {};
        request.id = imageId;
        request.width = this.config.images.view.width;
        request.height = this.config.images.view.height;
	    var imagePage = new imgPage(request, this.config);
        imagePage.returnImage(undefined, store);
    }
}