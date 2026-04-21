class Vector2D {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }

    static get zero() {
        return new Vector2D();
    }

    get isZero() {
        return this.x === 0 && this.y === 0;
    }

    get length() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    addTo(v) {
        if (v instanceof Vector2D) {
            this.x += v.x;
            this.y += v.y;
        } else if (typeof v === 'number') {
            this.x += v;
            this.y += v;
        }
        return this;
    }

    add(v) {
        return this.copy().addTo(v);
    }

    subtractFrom(v) {
        if (v instanceof Vector2D) {
            this.x -= v.x;
            this.y -= v.y;
        } else if (typeof v === 'number') {
            this.x -= v;
            this.y -= v;
        }
        return this;
    }

    subtract(v) {
        return this.copy().subtractFrom(v);
    }

    divideBy(v) {
        if (v instanceof Vector2D) {
            this.x /= v.x;
            this.y /= v.y;
        } else if (typeof v === 'number') {
            this.x /= v;
            this.y /= v;
        }
        return this;
    }

    divide(v) {
        return this.copy().divideBy(v);
    }

    multiplyWith(v) {
        if (v instanceof Vector2D) {
            this.x *= v.x;
            this.y *= v.y;
        } else if (typeof v === 'number') {
            this.x *= v;
            this.y *= v;
        }
        return this;
    }

    multiply(v) {
        return this.copy().multiplyWith(v);
    }

    normalize() {
        const length = this.length;
        if (length !== 0) {
            this.divideBy(length);
        }
        return this;
    }

    copy() {
        return new Vector2D(this.x, this.y);
    }

    equals(obj) {
        return obj instanceof Vector2D && this.x === obj.x && this.y === obj.y;
    }

    distanceFrom(obj) {
        return Math.sqrt((this.x - obj.x) ** 2 + (this.y - obj.y) ** 2);
    }
    magnitude() {
        return Math.sqrt(this.x ** 2 + this.y ** 2);
    }
    dot(other) {
        return this.x * other.x + this.y * other.y;
    }
    // Góc giữa hai vector (đơn vị: radian)
    angle(that = new Vector2D(1,0)) {
        return Math.atan2(that.y, that.x) - Math.atan2(this.y, this.x);
    }
    toString() {
        return `(${this.x}, ${this.y})`;
    }

}
