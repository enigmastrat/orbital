/*
 * Copyright 2022 Robert Reed
 */

$(document).ready(init);

var canvas;
var ctx;

var dots = [];
var width;
var height;
var colorPicker;

var initTimer;

let worldRadius = 75;
let vehicleRadius = 20;
let gravityFactor = 4000;
let speedFactor = .025;



// Should be very close to, but below 1, like .9995
// Numbers above 1 would cause orbitalExpansion
let orbitalDecay = .9995;
let planet1;
let planet2;

function init() {

  $("#demo-canvas").mousedown(handleCanvasClick);

  // TODO figure out if I can use touch events
  //document.getElementById("demo-canvas").addEventListener('touchstart', handleCanvasTouch);


  setWindowSize();
  setPlanetLocations();

  window.setInterval(drawCanvas, 15);
  window.setInterval(cleanData, 100);
  window.setInterval(recalculateData, 10);

  window.addEventListener('resize', setWindowSize, true);
  window.addEventListener('resize', setPlanetLocations, true);
}

function setWindowSize() {
  canvas = document.getElementById("demo-canvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  width = $("#demo-canvas").width();
  height = $("#demo-canvas").height();
  ctx = canvas.getContext("2d");
}

function setPlanetLocations() {
  let baseRadius = 50;
  let p1Weight = 1+Math.random();
  let p2Weight = 1+Math.random();

  planet1 = {
    color: "#08F",
    x: canvas.width/4,
    y: canvas.height/2,
    radius: baseRadius,
    impacts: (planet1) ? planet1.impacts : 0,
    weight: 1,
    rocketImage: "img/blueRocket.png"
  };
  planet2 = {
    color: "#F40",
    x: 3*canvas.width/4,
    y: canvas.height/2,
    radius: baseRadius,
    impacts: (planet2) ? planet2.impacts : 0,
    weight: 1,
    rocketImage: "img/redRocket.png"
  };
}

function handleCanvasClick(event) {
  if (initTimer) {
    window.clearTimeout(initTimer);
    initTimer = undefined;
  }

  const x = event.offsetX;
  const y = event.offsetY;

  // TODO make it so clicking the planet adds a shield instead of explodes
  addBall(x,y);
}

// TODO figure out if I can use touch events
function handleCanvasTouch(event) {
  for (let i in event.targetTouches) {
    let t = event.targetTouches[i];
    addBall(t.offsetX, t.offsetY);
  }
}

function addBall(x, y) {
  const width = "10";
  const height = "10";

  let direction = (x < (canvas.width/2)) ? 1 : -1;
  let color = (direction > 0) ? planet1.color : planet2.color;
  let image = (direction > 0) ? planet1.rocketImage : planet2.rocketImage;

  dots.push({
    x: x,
    y: y,
    xv: direction*((5+Math.random()*5)/speedFactor),
    v: ((Math.random()*2)-2)/speedFactor,
    bounciness: -((Math.random()*.10)+.8),
    width: width,
    height: height,
    radius: 2+Math.random()*4,
    color: color,
    time: (new Date()).getTime(),
    impacted: false,
    image: image
  });
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawCanvas() {
  clearCanvas();

  drawPlanet(planet1);
  drawPlanet(planet2);

  for (let i in dots) {
    let dot = dots[i];


    if(dot.x > canvas.width || dot.x < 0 || dot.y > canvas.height || dot.y < 0) {
      continue;
    }

    // TODO figure out how to deal with image angles
    if (!dot.impacted) {
      let image = new Image(dot.radius, dot.radius);
      image.src = dot.image;
      let dx = dot.x - dot.radius;
      let dy = dot.y - dot.radius;
      let angle = Math.atan2(dot.v, dot.xv);
      ctx.save();
      ctx.translate(dot.x, dot.y);
      ctx.rotate(angle + Math.PI * .5);// * Math.PI / 180);
      ctx.drawImage(image, -image.width*3, 0, 10, 20);
      ctx.restore();
    } else {
      ctx.fillStyle = dot.color;
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2, true);
      ctx.fill();
    }

  }

  drawScore(planet1.impacts, planet2.x, 30, planet2.color);
  drawScore(planet2.impacts, planet1.x, 30, planet1.color);
}

function drawScore(score, x, y, color) {
  ctx.fillStyle = color;
  ctx.font = "30px Arial";
  ctx.fillText(score, x, y);
}

function drawPlanet(planet) {
  ctx.fillStyle = planet.color;
  ctx.beginPath();
  ctx.arc(planet.x, planet.y, planet.radius+2, 0, Math.PI * 2, true);
  ctx.fill();

  let image = new Image(planet.radius, planet.radius);
  image.src = "img/earth.png";
  let px = planet.x-planet.radius;
  let py = planet.y-planet.radius;
  ctx.drawImage(image, px,py,planet.radius*2, planet.radius*2);
}

function cleanData() {
  let newDots = [];
  for (let i in dots) {
    let dot = dots[i];
    if (dot.radius < worldRadius) { // (dot.time > (new Date()).getTime()-20000 && dot.radius < worldRadius) {
      newDots.push(dot);
    }
  }

  dots = newDots;
}

function checkIntercepts(dots) {
  for (let i=0; i<dots.length; i++) {
    for (let j=i+1; j<dots.length; j++) {
      dot1 = dots[i];
      dot2 = dots[j];

      if (!dot1.impacted && dotDistance(dot1,dot2) < vehicleRadius) {
        dot1.impacted = true;
        dot2.impacted = true;
      }
    }
  }
}


let lastCalcTime = (new Date()).getTime();
function recalculateData() {
  checkIntercepts(dots);

  // TODO drop origV in favor of using "elapsedTimeSinceLastRecalculation" (rather than total elapsed time)
  for (let i in dots) {
    let dot = dots[i];
    let elapsedTime = ((new Date()).getTime() - lastCalcTime)*1.0/1000.0;

    let p1Stats = getPlanetDistanceStats(planet1, dot);
    let p2Stats = getPlanetDistanceStats(planet2, dot);

    let p1Impact = impactedPlanet(planet1, dot, p1Stats.dist);
    let p2Impact = impactedPlanet(planet2, dot, p2Stats.dist)

    if ( p1Impact || p2Impact ) {
      if (!dot.impacted) {
        dot.radius = worldRadius*.75;
        dot.color = "#FA0";
        if(p1Impact) {
          planet1.impacts++;
        } else if(p2Impact) {
          planet2.impacts++;
        }
      }
      dot.impacted = true;
    }

    if (dot.impacted) {
      dot.radius *= 1.15;
    }

    if (!dot.impacted) {
      dot.v = (orbitalDecay*dot.v) + (forceEffectY(p1Stats) + forceEffectY(p2Stats))/speedFactor;
      dot.xv = (orbitalDecay*dot.xv) + (forceEffectX(p1Stats) + forceEffectX(p2Stats))/speedFactor;

      dot.y = dot.y + (dot.v*elapsedTime);
      dot.x = dot.x + (dot.xv*elapsedTime);
    }
  }
  lastCalcTime = (new Date()).getTime();
}

function getPlanetDistanceStats(planet, dot) {
  let distX = planet.x-dot.x;
  let distY = planet.y-dot.y;
  let dist = Math.sqrt(distX*distX + distY*distY);
  let force = gravityFactor*(planet.weight/(dist*dist));
  let velocityChange = Math.sqrt(2*force); // F = (1/2)mv^2 TODO figure out if this is needed

  let percentY = (distY*distY)/(distX*distX + distY*distY);
  let percentX = (distX*distX)/(distX*distX + distY*distY);
  return {
    distX: distX,
    distY: distY,
    dist: dist,
    force: force,
    percentY: percentY,
    percentX: percentX,
    velocityChange: velocityChange
  };
}

function forceEffectY(pstats) {
  return pstats.force * pstats.percentY * (pstats.distY / Math.abs(pstats.distY));
}
function forceEffectX(pstats) {
  return pstats.force * pstats.percentX * (pstats.distX / Math.abs(pstats.distX));
}

function impactedPlanet(planet, dot, distance) {
  return distance < (dot.radius+planet.radius);
}

function dotDistance(dot1, dot2) {
  return Math.sqrt( Math.pow(dot1.x-dot2.x,2)+Math.pow(dot1.y-dot2.y,2) )
}
