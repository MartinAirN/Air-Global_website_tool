'use strict';

const ExifTransformer = require('exif-be-gone');
const fs = require('fs');
const Jimp = require('jimp');
const path = require('path');
const cachedJpegDecoder = Jimp.decoders["image/jpeg"];
Jimp.decoders["image/jpeg"] = (data) => {
  const userOpts = { maxMemoryUsageInMB: 2048 };
  return cachedJpegDecoder(data, userOpts);
};

module.exports = class ImgPage {
    id = "";
    width = 0;
    height = 0;
    format = "";
    config = {};
    constructor(imageRequest, config) {
        const widthString = imageRequest.width;
        const heightString = imageRequest.height;

        this.config = config;
        this.id = imageRequest.id;
        this.format = imageRequest.format;
        if (widthString) {
        	this.width = parseInt(widthString);
        }
        if (heightString) {
        	this.height = parseInt(heightString);
        }
	}

    async returnImage(res, store) {
        var imagePath = this.getImagePath(store);
        if (this.width != 0 || this.height != 0) {
            var cacheImagePath = path.join(__dirname, 
                                        this.config.site.folders.cache ,
                                        `${this.width}x${this.height}`,
                                        imagePath);
            if (!fs.existsSync(cacheImagePath)) {
                await this.createImage(path.join(__dirname, imagePath), cacheImagePath);
                console.log(`[returnImage] Created image: ${cacheImagePath}`);
            }
            imagePath = cacheImagePath;
        }
        if (res) {
            this.sendFile(res, imagePath);
        }
    }

    sendFile(res, cacheImagePath) {
        const reader = fs.createReadStream(cacheImagePath);
        reader.pipe(new ExifTransformer()).pipe(res);
    }

    async createImage(inputPath, outputPath) {
        fs.mkdirSync(path.dirname(outputPath), {recursive: true});
        var width = (this.width == 0) ? Jimp.AUTO : Number(this.width);
        var height = (this.height == 0) ? Jimp.AUTO : Number(this.height);

        let file = await Jimp.read(inputPath);
        if (width != Jimp.AUTO && height != Jimp.AUTO) {
            if ((height * file.getWidth() / width) < file.getHeight()) {
                width = Jimp.AUTO;
            } else {
                height = Jimp.AUTO;
            }
        }
        await file.resize(width, height).quality(Number(this.config.images.view.quality));
        await file.writeAsync(outputPath);
    }

    getImagePath(store) {
        var imagepath = store.getImagePath(this.id);
        if (imagepath) {
            return path.join(this.config.site.folders.images, imagepath);
        } else {
            return this.config.error.image_not_found;
        }
    }
}