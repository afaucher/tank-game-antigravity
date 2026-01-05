class AssetManager {
    constructor() {
        this.sheets = {};
        this.sprites = {};
        this.loaded = false;
    }

    loadAssets(imagePath, xmlString, sheetName = 'default') {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.src = imagePath;
            image.onload = () => {
                this.sheets[sheetName] = image;
                if (xmlString) {
                    try {
                        const parser = new DOMParser();
                        const xml = parser.parseFromString(xmlString, "text/xml");
                        this.parseXML(xml, sheetName);
                        this.loaded = true;
                        resolve();
                    } catch (e) {
                        reject(e);
                    }
                } else {
                    resolve();
                }
            };
            image.onerror = (e) => reject(e);
        });
    }

    parseXML(xml, sheetName) {
        const subTextures = xml.getElementsByTagName('SubTexture');
        for (let i = 0; i < subTextures.length; i++) {
            const texture = subTextures[i];
            const name = texture.getAttribute('name');
            const x = parseInt(texture.getAttribute('x'));
            const y = parseInt(texture.getAttribute('y'));
            const width = parseInt(texture.getAttribute('width'));
            const height = parseInt(texture.getAttribute('height'));
            const cleanName = name.replace('.png', '');

            this.sprites[cleanName] = { x, y, width, height, sheet: sheetName };
        }
    }

    registerSprite(name, sheetName, x, y, width, height) {
        this.sprites[name] = { x, y, width, height, sheet: sheetName };
    }

    getSprite(name) {
        return this.sprites[name];
    }

    drawSprite(ctx, name, x, y, width, height, rotation = 0) {
        const sprite = this.sprites[name];
        if (!sprite) {
            // console.warn(`Sprite ${name} not found`);
            return;
        }

        const img = this.sheets[sprite.sheet];
        if (!img) return;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);

        const targetWidth = width || sprite.width;
        const targetHeight = height || sprite.height;

        ctx.drawImage(
            img,
            sprite.x, sprite.y, sprite.width, sprite.height,
            -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight
        );
        ctx.restore();
    }
}
