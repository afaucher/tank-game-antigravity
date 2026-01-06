class AssetManager {
    constructor() {
        this.images = {}; // Name -> Image
        this.loadedCount = 0;
        this.totalCount = 0;
    }

    loadImages(fileList, basePath = 'assets/PNG/Default size/') {
        return new Promise((resolve, reject) => {
            this.totalCount = fileList.length;
            this.loadedCount = 0;
            let errors = 0;

            if (this.totalCount === 0) resolve();

            fileList.forEach(filename => {
                const name = filename.replace('.png', '');
                const img = new Image();
                img.src = basePath + filename;

                img.onload = () => {
                    this.images[name] = img;
                    this.loadedCount++;
                    if (this.loadedCount + errors === this.totalCount) {
                        resolve();
                    }
                };

                img.onerror = (e) => {
                    console.error(`Failed to load image: ${filename}`, e);
                    errors++;
                    if (this.loadedCount + errors === this.totalCount) {
                        // Resolve anyway so game can start (maybe with missing assets)
                        resolve();
                    }
                };
            });
        });
    }

    getSprite(name) {
        return this.images[name];
    }

    drawSprite(ctx, name, x, y, width, height, rotation = 0) {
        const img = this.images[name];
        if (!img) {
            // console.warn(`Sprite ${name} not found`);
            return;
        }

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);

        const targetWidth = width || img.width;
        const targetHeight = height || img.height;

        ctx.drawImage(
            img,
            -targetWidth / 2, -targetHeight / 2,
            targetWidth, targetHeight
        );
        ctx.restore();
    }
}
