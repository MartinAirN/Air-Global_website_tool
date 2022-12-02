'use strict';

const ExifReader = require('exifreader');
const fs = require('fs');
const path = require('path');
const uuid = require("uuid");

const config = require('./config.json');
const storeFile = './store.json';
const idFile = './store_id.json';
const labelFile = './store_label.json';

function AlbumNotFoundException(message) {
	this.message = message;
	this.default = 'Album Not Found, please make sure you have the correct link.';
}

function NotAllowedException(message) {
	this.message = message;
	this.default = 'Not Allowed, you attempted to access something you do not have access to.';
}

module.exports = class Store {
	stored = {};
	idstore = {};
	constructor() {
		if(fs.existsSync(storeFile) && fs.existsSync(idFile)) {
			this.stored = require(storeFile);
			this.idstore = require(idFile);
		} else {
			this.scanFileSystem(config.site.folders.images, this.stored);
			this.writeToDisk(JSON.stringify(this.stored), storeFile);
			this.writeToDisk(JSON.stringify(this.idstore), idFile);
		}
	}
	
	scanFileSystem(folder, storeObject, labelObject = undefined) {
		const files = fs.readdirSync(folder);
		files.forEach(file => {
			var relativePath = path.join(folder, file);
			var fullPath = path.join(__dirname, relativePath);
			var item = {
				name: file,
				relative: relativePath,
				path: fullPath,
				labels: {}
			};
			if (fs.statSync(fullPath).isFile()) {
				if (file !== 'note.txt') {
					this.addImage(item, storeObject, labelObject);
				}
			} else {
				item.data = {};
				let folderPath = path.join(folder, file);
				this.scanFileSystem(folderPath, item.data, item.labels);
				let subtitlePath = path.join(folderPath, config.images.albumSubTitleFile);
				if (fs.existsSync(subtitlePath) && fs.statSync(subtitlePath).isFile()) {
					item.note = fs.readFileSync(subtitlePath, {encoding:'utf8', flag:'r'});
				}
				eval('storeObject["' + file + '"]= item');
			}
		});
	}
	
	addImage(image, storeObject, labelObject) {
		try {
			var buffer = fs.readFileSync(image.relative);
			var metadata = ExifReader.load(buffer, {expanded: true});
			image.title = (metadata.iptc && metadata.iptc["Object Name"] && metadata.iptc["Object Name"].description ? metadata.iptc["Object Name"].description : "");
			image.description = (metadata.iptc && metadata.iptc["Caption/Abstract"] && metadata.iptc["Caption/Abstract"].description ? metadata.iptc["Caption/Abstract"].description : "");
			image.date = (metadata.exif && metadata.exif.DateTimeOriginal && metadata.exif.DateTimeOriginal.description ? metadata.exif.DateTimeOriginal.description : "");
			image.labels = []
			if (metadata.iptc && metadata.iptc.Keywords) {
				if (Array.isArray(metadata.iptc.Keywords)) {
					for (let i in metadata.iptc.Keywords) {
						this.addLabel(labelObject, image, metadata.iptc.Keywords[i].description);
					}
				} else {
					this.addLabel(labelObject, image, metadata.iptc.Keywords.description);
				}
			}

			var uniqueID = uuid.v4();
			image.id = uniqueID;
			storeObject[image.name] = image;
			if (image.relative.startsWith(config.site.folders.images)) {
				eval('this.idstore["' + uniqueID + '"] = "' + image.relative.substring(config.site.folders.images.length) + '"');
			} else {
				eval('this.idstore["' + uniqueID + '"] = "' + image.relative + '"');
			}
		}
		catch (e) {
			console.log("[addImage] Image (" + image.relative +") not added due to error: " + e);
		}
	}

	addLabel(labelObject, image, label) {
		image.labels.push(label);
		if (labelObject) {
			labelObject[label] = (labelObject[label] ? Number(labelObject[label]) + 1 : 1);
		}
	}
	
	writeToDisk(json, path) {
		fs.writeFileSync(path, json, 'utf8', (err) => {
			if (err) {
				console.log(`[writeToDisk] Error writing file: ${err}`);
			} else {
				console.log(`[writeToDisk] File (` + path + `) is written successfully!`);
			}
		});
	}
	
	getImages(imageDirUrl, storeToUse, includeSubDirectories = false, category = undefined) {
		if (!storeToUse) {
			storeToUse = this.stored;
		}

		if (imageDirUrl.startsWith(path.sep)) {
			throw new NotAllowedException("[getImages] Image directory not allowed (" + imageDirUrl + ")");
		}
		if (imageDirUrl.endsWith(path.sep)) {
			imageDirUrl = imageDirUrl.substring(0, imageDirUrl.length - 1)
		}
		
		var pathSections = imageDirUrl.split(path.sep).filter(item => item != '');
		var subStore = {}
		if (!storeToUse[pathSections[0]]) {
			throw new AlbumNotFoundException(`[getImages] Image Dir not found: ${pathSections[0]}`);
		}
		if (storeToUse[pathSections[0]].data) {
			subStore = storeToUse[pathSections[0]].data;
		} else {
			subStore = storeToUse[pathSections[0]];
		}
		if (pathSections.length > 1) {
			return this.getImages(this.pathJoin(pathSections.slice(1, pathSections.length)), subStore, includeSubDirectories, category);
		} else {
			let outputList = {};
			if (subStore) {
				let keys = Object.keys(subStore);
				for (let i = 0; i < keys.length; i++) {
					let itemkey = keys[i];
					if (subStore[itemkey].id && (!category || (subStore[itemkey].labels && subStore[itemkey].labels.includes(category)))) {
						outputList[itemkey] = subStore[itemkey];
					} else if (!subStore[itemkey].id && includeSubDirectories) {
						let subresults = this.getImages(itemkey, subStore, includeSubDirectories, category);
						let subkeys = Object.keys(subresults);
						for (let j = 0; j < subkeys.length; j++) {
							let subkey = subkeys[j];
							outputList["sub/"+subkey] = subresults[subkey];
						}
					}
				}
			}
			return outputList;
		}
	}

	getImagesSorted(imageDirUrl, reverse = false, amount = -1, includeSubDirectories = false, category = undefined) {
		let images = this.getImages(imageDirUrl, this.stored, includeSubDirectories, category);
		let keys = Object.keys(images);
		let output = [];
		for (let j = 0; j < keys.length; j++) {
			output.push(images[keys[j]]);
		}
		if (reverse) {
			output.sort((a,b) => this.toDate(b.date) - this.toDate(a.date));
		} else {
			output.sort((a,b) => this.toDate(a.date) - this.toDate(b.date));
		}
		if (amount > -1) {
			return output.slice(0, Number(amount));
		} else {
			return output;
		}
	}

	getImagesRandomized(imageDirUrl, amount = -1, includeSubDirectories = false, category = undefined) {
		let images = this.getImages(imageDirUrl, this.stored, includeSubDirectories, category);
		let output = [];

		let keys = Object.keys(images);
		for (let i = 0; i < keys.length; i++) {
			output.push(images[keys[i]]);
		}
		for (let i = output.length -1; i > 0; i--) {
			let j = Math.floor(Math.random() * i)
			let k = output[i];
			output[i] = output[j];
			output[j] = k;
		}
		if (amount > -1) {
			return output.slice(0, Number(amount));
		} else {
			return output;
		}
	}

	getLabels(imageDirUrl, includeSubDirectories = false) {
		let labels = {};
		try {
			this.getLabelInfo(imageDirUrl, this.stored, includeSubDirectories, labels);
		} catch (e) {console.log(e)}
		let keys = Object.keys(labels);
		let output = [];
		for (let j = 0; j < keys.length; j++) {
			let label = {};
			label.name = keys[j];
			label.value = labels[keys[j]];
			output.push(label);
		}
		output.sort((a,b) => Number(b.value) - Number(a.value));
		return output;
	}

	getLabelInfo(imageDirUrl, storeToUse, includeSubDirectories, output) {
		if (imageDirUrl.endsWith(path.sep)) {
			imageDirUrl = imageDirUrl.substring(0, imageDirUrl.length - 1)
		}
		var pathSections = imageDirUrl.split(path.sep).filter(item => item != '');
		var subStore = {}
		if (!storeToUse[pathSections[0]]) {
			throw new AlbumNotFoundException(`[LabelInfo] Image Dir not found: ${pathSections[0]}`);
		}
		subStore = storeToUse[pathSections[0]];
		if (pathSections.length > 1) {
			return this.getLabelInfo(this.pathJoin(pathSections.slice(1, pathSections.length)), subStore.data, includeSubDirectories, output);
		} else {
			if (subStore.data) {
				let keys = Object.keys(subStore.labels);
				let values = Object.values(subStore.labels);
				for (let i = 0; i < keys.length; i++) {
					let itemkey = keys[i];
					let itemvalue = Number(values[i]);
					output[itemkey] = (output[itemkey] ? Number(output[itemkey]) + itemvalue : itemvalue);
				}
				if (includeSubDirectories) {
					let keys = Object.keys(subStore.data);
					for (let i = 0; i < keys.length; i++) {
						let itemkey = keys[i];
						if (!subStore.data[itemkey].id) {
							this.getLabelInfo(itemkey, subStore.data, includeSubDirectories, output);
						}
					}
				}
			}
		}
	}

	getSubTitle(imageDirUrl) {
		try {
			return this.getSubTitleFromStore(imageDirUrl, this.stored);
		} catch(e) {
			console.log(e);
			return null;
		}
	}

	getSubTitleFromStore(imageDirUrl, storeToUse) {
		if (imageDirUrl.endsWith(path.sep)) {
			imageDirUrl = imageDirUrl.substring(0, imageDirUrl.length - 1)
		}
		var pathSections = imageDirUrl.split(path.sep).filter(item => item != '');
		var subStore = {}
		if (!storeToUse[pathSections[0]]) {
			throw new AlbumNotFoundException(`[SubTitle] Image Dir not found: ${pathSections[0]}`);
		}
		subStore = storeToUse[pathSections[0]];
		if (pathSections.length > 1) {
			return this.getSubTitleFromStore(this.pathJoin(pathSections.slice(1, pathSections.length)), subStore.data);
		} else {
			return subStore.note;
		}
	}

	getFolders(imageDirUrl) {
		let output = [];
		try {
			let store = this.getStore(imageDirUrl, this.stored);
			let keys = Object.keys(store);
			for (let index in keys) {
				let key = keys[index];
				if (store[key].data) {
					output.push(key);
				}
			}
		} catch (e) {}
		return output;
	}

	getStore(dirUrl, storeToUse) {
		var pathSections = dirUrl.split(path.sep);
		var subStore = {}
		if (!storeToUse[pathSections[0]]) {
			throw new AlbumNotFoundException(`[getStore] Dir not found: ${pathSections[0]}`);
		}
		if (storeToUse[pathSections[0]].data) {
			subStore = storeToUse[pathSections[0]].data;
		} else {
			subStore = storeToUse[pathSections[0]];
		}
		if (pathSections.length > 1) {
			return this.getStore(this.pathJoin(pathSections.slice(1, pathSections.length)), subStore);
		} else {
			return subStore;
		}
	}

	getImagePath(imageID) {
		return this.idstore[imageID];
	}

	pathJoin(array) {
		var newPath = "";
		array.forEach(part => newPath = path.join(newPath, part));
		return newPath;
	}

	toDate(dateString) {
		let date = dateString.replace(" ",":").split(":");
		return new Date(Number(date[0]), Number(date[1])-1, Number(date[2]), Number(date[3]), Number(date[4]), Number(date[5]), 0);
	}
}
