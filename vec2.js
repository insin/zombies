function Vec2(x, y) {
  this.x = x
  this.y = y
}

Vec2.prototype.magnitude = function() {
  return Math.sqrt(this.x * this.x + this.y * this.y)
}

Vec2.prototype.scale = function(s) {
  this.x *= s
  this.y *= s
  return this
}

Vec2.prototype.normalise = function() {
  return this.scale(1 / this.magnitude())
}

Vec2.prototype.clone = function() {
  return new Vec2(this.x, this.y)
}

Vec2.dot = function(a, b) {
  return a.x * b.x + a.y * b.y
}
