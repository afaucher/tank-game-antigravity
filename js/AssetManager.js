class AssetManager {
    constructor() {
        this.spritesheet = new Image();
        this.sprites = {};
        this.loaded = false;
    }

    loadAssets(imagePath, xmlString) {
        return new Promise((resolve, reject) => {
            // Load Image
            this.spritesheet.src = imagePath;
            this.spritesheet.onload = () => {
                // Parse XML String directly
                try {
                    const parser = new DOMParser();
                    const xml = parser.parseFromString(xmlString, "text/xml");
                    this.parseXML(xml);
                    this.loaded = true;
                    resolve();
                } catch (e) {
                    reject(e);
                }
            };
            this.spritesheet.onerror = (e) => reject(e);
        });
    }

    parseXML(xml) {
        const subTextures = xml.getElementsByTagName('SubTexture');
        for (let i = 0; i < subTextures.length; i++) {
            const texture = subTextures[i];
            const name = texture.getAttribute('name');
            const x = parseInt(texture.getAttribute('x'));
            const y = parseInt(texture.getAttribute('y'));
            const width = parseInt(texture.getAttribute('width'));
            const height = parseInt(texture.getAttribute('height'));

            // Remove .png from name for easier access if desired, but keeping it is fine too
            // Let's strip extension for cleaner code usage: "tankBody_red" vs "tankBody_red.png"
            const cleanName = name.replace('.png', '');

            this.sprites[cleanName] = { x, y, width, height };
        }
    }

    getSprite(name) {
        return this.sprites[name];
    }

    drawSprite(ctx, name, x, y, width, height, rotation = 0) {
        const sprite = this.sprites[name];
        if (!sprite) {
            console.warn(`Sprite ${name} not found`);
            return;
        }

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);

        // If width/height provided, scale to fit. Otherwise use sprite dimensions
        // But usually we want to draw it centered at x,y
        const targetWidth = width || sprite.width;
        const targetHeight = height || sprite.height;

        ctx.drawImage(
            this.spritesheet,
            sprite.x, sprite.y, sprite.width, sprite.height,
            -targetWidth / 2, -targetHeight / 2, targetWidth, targetHeight
        );
        ctx.restore();
    }
}
