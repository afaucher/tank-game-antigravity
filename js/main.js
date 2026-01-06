

window.addEventListener('load', function () {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // Set canvas size
    canvas.width = 1200;
    canvas.height = 800;

    const game = new Game(canvas.width, canvas.height);
    const assetManager = new AssetManager();
    game.assetManager = assetManager;

    let lastTime = 0;

    function animate(timeStamp) {
        const deltaTime = timeStamp - lastTime;
        lastTime = timeStamp;

        ctx.fillStyle = 'rgba(34, 34, 34, 0.3)';
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        game.update(deltaTime);
        game.draw(ctx);

        requestAnimationFrame(animate);
    }

    assetManager.loadImages(ASSET_FILES)
        .then(() => {
            game.start();
            animate(0);
        })
        .catch(err => console.error("Failed to load assets", err));
});
