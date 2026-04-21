class MyCanvas {
    constructor() {
        this.canvas = document.getElementById("myCanvas");
        // this.img = document.getElementById("imageCanvas"); // Lấy thẻ <img> từ HTML
        
        if (!this.canvas) {
            throw new Error("Canvas ID không tồn tại!");
        }
        
        this.context = this.canvas.getContext("2d");
       
        // Đặt kích thước canvas full màn hình
        this.resizeCanvas();

        // Lắng nghe sự kiện resize
        window.addEventListener("resize", () => this.resizeCanvas());
    }
    getScale(){
        try{
            return Math.min(
                this.canvas.width*1.0/PoolGame.getInstance().gameWorld.width,
                this.canvas.height*1.0/PoolGame.getInstance().gameWorld.height
            );
        }catch (e){
            return 1;
        }
    }
    getOffset(){
        try{
            return this.size.subtract(PoolGame.getInstance().gameWorld.size.multiply(this.getScale())).divideBy(2);
        }catch (e){
            console.log(e)
            return Vector2D.zero;
        }
    }
    resizeCanvas() {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        this.size = new Vector2D(this.canvas.width,this.canvas.height);
    }
    DrawImage(image, position, angle,origin = new Vector2D(0,0)) {
        if (!image.complete) {
            console.warn("Hình ảnh chưa được load hoàn toàn.");
            return;
        }
        let newpos = position.multiply(this.getScale()).add(this.getOffset());
        let neworigin = origin.multiply(this.getScale());

        const { x, y } = newpos;
        const u=neworigin.x, v = neworigin.y;

        const imageWidth = image.width;
        const imageHeight = image.height;
        const newWidth = imageWidth * this.getScale();
        const newHeight = imageHeight * this.getScale();
        const radians = (angle * Math.PI) / 180; 
        
        this.context.save(); 
        this.context.translate(x, y); // Di chuyển đến vị trí vẽ
        this.context.rotate(radians); // Xoay ảnh
        this.context.drawImage(image, -u,-v,newWidth,newHeight); // Vẽ ảnh với tâm tại vị trí u,v, kích thước tùy chỉnh
        this.context.restore(); // Khôi phục trạng thái ban đầu
    }

    ClearFrame() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    DrawLine(startPos,endPos){
        // Start a new Path
        this.context.beginPath();
        startPos = startPos.multiply(this.getScale()).add(this.getOffset());
        endPos = endPos.multiply(this.getScale()).add(this.getOffset());
        this.context.moveTo(startPos.x,startPos.y);
        this.context.lineTo(endPos.x, endPos.y);
        this.context.strokeStyle = "white";

        // Draw the Path
        this.context.stroke();
    }
    DrawCircle(pos,radius){
        pos = pos.multiply(this.getScale()).add(this.getOffset());
        radius=radius*this.getScale();
        this.context.beginPath();
        this.context.arc(pos.x, pos.y, radius, 0, 2 * Math.PI);
        this.strokeStyle = "white";
        // Draw the Circle
        this.context.stroke();
    }
}
