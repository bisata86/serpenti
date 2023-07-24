var app = require('express')();
var express = require('express')
var http = require('http').Server(app);
var io = require('socket.io')(http);


app.use(express.static(__dirname + '/public', {
    maxage: process.env.NODE_ENV == "production" ? '0d' : '0d'
})) 

var port = process.env.PORT || 3000;


var game = {};

var ballLimit = 250;
var mapDim = 1000;
var initailSpeed = .1;
var snakes = {};
addAiSnake(20)

function addAiSnake(n) {
  for (var i = 0; i < n; i++) {
      snakes[uuid()] = {
      x:rint(10,mapDim-10),
      y:rint(10,mapDim-10),
      r:0,
      angle:0,
      dim:5,
      speed:2,
      l:5,
      history:[],
      ai:true
    }
  }
}


var balls = {};
for (var i = 0; i < ballLimit; i++) {
      balls[uuid()] = {
      x:rint(10,mapDim-10),
      y:rint(10,mapDim-10),
      dim:rint(1,3)
    }
}

var mainInt;
var time = new Date().getTime()
mainInt = setInterval(function(){
  for (var i in snakes) {
    //if(snakes[i].x<100)
      if(!snakes[i].dead) {
        //snakes[i].speed = snakes[i].dim/4
        var r = rotate(snakes[i].x,snakes[i].y,snakes[i].x,snakes[i].y+snakes[i].speed,snakes[i].angle)
        
        snakes[i].x = r[0]
        snakes[i].y = r[1]
        if(snakes[i].history.length==0) {
          snakes[i].history.push({x:snakes[i].x,y:snakes[i].y})
        }
        else if(distance(snakes[i].history[snakes[i].history.length-1],snakes[i])>snakes[i].dim/2)
          snakes[i].history.push({x:snakes[i].x,y:snakes[i].y})
        if(snakes[i].history.length>snakes[i].l) {
          snakes[i].history.shift();
        }

        for (var m in balls) {
          var a = balls[m].x - snakes[i].x;
          var b = balls[m].y - snakes[i].y;
          var c = Math.sqrt( a*a + b*b );
          if(c<snakes[i].dim/2) {
            balls[m].taken = true;
            snakes[i].l+=balls[m].dim
            snakes[i].r+=2
            if(snakes[i].dim<20)
              snakes[i].dim+=.1
          }
        }
        var nb = {}
        for (var m in balls) {
          if(!balls[m].taken) {
            nb[m] = balls[m]
          };
        }
        balls = nb
        if(Object.keys(balls).length<ballLimit) {
          balls[uuid()] = {
            x:rint(10,mapDim-10),
            y:rint(10,mapDim-10),
            dim:rint(1,1)
          }
        }

        if(snakes[i].x<0 || snakes[i].x>mapDim || snakes[i].y<0 || snakes[i].y>mapDim ) {
          snakes[i].dead = true;
          for (var n in snakes[i].history) {
            balls[uuid()] = {
              x:snakes[i].history[n].x,
              y:snakes[i].history[n].y,
              dim:1
            }
          }
          if(snakes[i].ai == true) {
            addAiSnake(1)
            
          }
        }


      }
      if(snakes[i].ai) {
        
        if(snakes[i].y<100) {
          snakes[i].angle = 0
        } else {
          var s = rint(0,10);
          snakes[i].angle+=s
        }
        

      }

      for (var k in snakes) {
        if(k!=i && !snakes[k].dead) {
          for (var p in snakes[k].history) {
              var a = snakes[k].history[p].x - snakes[i].x;
              var b = snakes[k].history[p].y - snakes[i].y;
              var c = Math.sqrt( a*a + b*b );
              if(c<snakes[i].dim/2) {
                console.log('collisionn')
                snakes[i].dead = true;
                for (var n in snakes[i].history) {
                  balls[uuid()] = {
                    x:snakes[i].history[n].x,
                    y:snakes[i].history[n].y,
                    dim:rint(1,1)
                  }
                }
                break;
              }
          }
        }
      }

  } 
  var nb = {}
  for (var m in snakes) {
    if(!snakes[m].dead) {
      nb[m] = snakes[m]
    };
  }
  snakes = nb
  console.log(new Date().getTime()-time)
  time  = new Date().getTime()

},100)
app.get('/*', function(req, res){
  res.sendfile('./index.html'); 
}); 

io.set('origins', '*:*');
io.on('connection', function(socket){
  socket.on('join', function(data){
     snakes[socket.id] = {
      x:rint(10,mapDim-10),
      y:rint(10,mapDim-10),
      r:100,
      //r:1000,
      angle:0,
      dim:5,
      speed:2,
      l:5,
      history:[]
    }
     socket.emit('start')
  }); 
  socket.on('getGame', function(data){
     if( snakes[socket.id]) {

     snakes[socket.id].angle = data.angle
     snakes[socket.id].speed = data.speed
     //snakes[socket.id].speed = snakes[socket.id].dim/2
     sendGame();
   }

     
  });
  socket.on('angle', function(data){
     snakes[socket.id].angle = data.angle
  });
  socket.on("disconnect", () => {
    //delete(snakes[socket.id]); 
    if(snakes[socket.id])
      snakes[socket.id].dead = true;
  });

  function sendGame() {
    var filteredBalls = {};
    for (var i in balls) {
      var a = balls[i].x - snakes[socket.id].x;
      var b = balls[i].y - snakes[socket.id].y;
      var c = Math.sqrt( a*a + b*b );
      if(c<snakes[socket.id].r) {
        filteredBalls[i] = balls[i]
      }
    }

    var filteredSnakes = {};
    for (var i in snakes) {
      var a = snakes[i].x - snakes[socket.id].x;
      var b = snakes[i].y - snakes[socket.id].y;
      var c = Math.sqrt( a*a + b*b );
      if(c<snakes[socket.id].r) {
        filteredSnakes[i] = snakes[i]
      }
      // if(snakes[i].l>5) {
      //   for (var j in snakes[i].history) {
      //     console.log(j)
      //   }
      // }
    }
    socket.emit('game',{snakes:filteredSnakes,balls:filteredBalls})
  }


});

function distance(p1,p2) {
  var a = p1.x - p2.x;
  var b = p1.y - p2.y;
  var c = Math.sqrt( a*a + b*b );
  return c;
}

function rint(min, max) { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min)
}

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function rotate(cx, cy, x, y, angle) {
    var radians = (Math.PI / 180) * angle,
        cos = Math.cos(radians),
        sin = Math.sin(radians),
        nx = (cos * (x - cx)) + (sin * (y - cy)) + cx,
        ny = (cos * (y - cy)) - (sin * (x - cx)) + cy;
    return [nx, ny];
}

http.listen(port, function(){
  console.log('g server up on port: '+port);
});
