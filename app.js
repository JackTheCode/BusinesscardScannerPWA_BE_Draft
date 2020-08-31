let bodyParser = require('body-parser');
let morgan = require('morgan');
let express = require('express');
const router = express.Router()
let multer = require('multer');
var cv = require('./node_modules/opencv/lib/opencv.js');
// let crypto = require('crypto');
// let fs = require('fs');

var lowThresh = 0;
var highThresh = 100;
var nIters = 2;
var minArea = 2000;
var maxArea = 100000;

var BLUE = [0, 255, 0]; //B, G, R
var RED   = [0, 0, 255]; //B, G, R
var GREEN = [0, 255, 0]; //B, G, R
var WHITE = [255, 255, 255]; //B, G, R

const storage = multer.diskStorage({
    destination: './upload',
    filename: function (req, file, callback) {
        console.log(file);
        var ext = require('path').extname(file.originalname);
        ext = ext.length>1 ? ext : "." + require('mime').extension(file.mimetype);
        // crypto.pseudoRandomBytes(16, function (err, raw) {
        //     callback(null, (err ? undefined : raw.toString('hex') ) + ext);
        // });
        callback(null, 'image' + ext);
    }
});  

var upload = multer({ storage: storage })

let port = 4000;
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(morgan('dev'));

// Add headers
app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
    res.setHeader('Access-Control-Allow-Credentials', true);
    next();
});


router.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
      console.log("No file received");
      return res.send({
        success: false
      });
  
    } else {
      console.log('file received');
      cv.readImage('./upload/image.png', function(err, im) {
        if (err) throw err;
        if (im.width() < 1 || im.height() < 1) throw new Error('Image has no size');
      
        var out = im.copy();
      
        const channels = im.split();
        im.merge([channels[0],channels[1],channels[2]]);
        im.convertGrayscale();

        var im_canny = im.copy();
      
        im_canny.canny(lowThresh, highThresh);
        im_canny.dilate(nIters);
      
        var contours = im_canny.findContours();
      
        for (var i = 0; i < contours.size(); i++) {
      
          var area = contours.area(i);
          if (area < minArea || area > maxArea) continue;
      
          var arcLength = contours.arcLength(i, true);
          contours.approxPolyDP(i, 0.01 * arcLength, true);
      
          if (contours.cornerCount(i) != 4) continue;
      
          var points = [
            contours.point(i, 0),
            contours.point(i, 1),
            contours.point(i, 2),
            contours.point(i, 3)
          ]
      
          out.line([points[0].x,points[0].y], [points[1].x, points[1].y], RED);
          out.line([points[1].x,points[1].y], [points[2].x, points[2].y], RED);
          out.line([points[2].x,points[2].y], [points[3].x, points[3].y], RED);
          out.line([points[3].x,points[3].y], [points[0].x, points[0].y], RED);
        }
      
        out.save('./quad-detected.jpg');
        console.log("Image processed")
      });
      return res.send({
        success: true
      })
    }
});

router.get('/download', (req, res) => {
    res.download(__dirname + '/quad-detected.jpg')
    console.log("File download " + __dirname + "/quad-detected.jpg");
})

app.use('/', router);

app.listen(port, () => {
    console.log("Server running on port " + port);
});
   
