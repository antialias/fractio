var fractal_plane = function(config, parent) {
    var ret = {};
    var canvas = document.createElement('canvas');
    canvas.id="fractal";
    canvas.width = config.size.width;
    canvas.height = config.size.height;
    var ctx = canvas.getContext("2d");
    if (parent) {
        parent.appendChild(canvas);
    }
    var cw = (config.plane.br.r - config.plane.ul.r),
        ch = (config.plane.br.i - config.plane.ul.i);
	ret.config = config;
    ret.cp_to_screen = function(cp) {
        return {
            x: (cp.r - config.plane.ul.r) * config.size.width / cw,
            y: (cp.i - config.plane.ul.i) * config.size.height / ch
        };
    };
    ret.screen_to_cp = function(xy) {
        return {
            r: (xy.x / config.size.width) * (config.plane.br.r - config.plane.ul.r) + config.plane.ul.r,
            i: (xy.y / config.size.height) * (config.plane.br.i - config.plane.ul.i) + config.plane.ul.i
        };
    };
    ret.draw = function(engine) {
        var x, y;
        for (x=0; x< config.size.width; x += config.block_size) {
            for(y=0; y < config.size.height ; y += config.block_size) {
                engine({x:x,y:y});
            }
        }
    };
	var mandel = function (cp, max_iter) {
	    var iter = max_iter;
	    var z = {r:0,i:0};
	    var c = {r:cp.r, i:cp.i};
	    while (iter > 0 && (z.r*z.r + z.i*z.i) < 4) {
	        --iter;
	        z = {
	            r:z.r * z.r - z.i * z.i + cp.r,
	            i:2 * z.r * z.i + cp.i
	        };
	        // c.r = z.r;
	        // c.i = z.i;
	    }
	    return (max_iter - iter);
	}
    ret.get_context = function() {
        return ctx;
    };
    ret.get_worker = function() {return function(xy, draw_to) {
		var scratch = document.createElement('canvas');
		scratch.width = config.block_size;
		scratch.height = config.block_size;
		var scratch_ctx = scratch.getContext("2d");
		var x,y;
		var noise = Math.random() * 0.75 + 0.75;
		for (x=xy.x; x < xy.x + config.block_size; x += config.resolution) {
			for (y=xy.y; y < xy.y + config.block_size; y += config.resolution) {
				var cp = ret.screen_to_cp({x:x,y:y});
				var max_iter = 100;
				mr = mandel(cp, max_iter);
				var shade = Math.ceil(noise * 256 * (max_iter - mr) / max_iter);
				scratch_ctx.fillStyle = "rgb(" + shade + "," + shade + "," + shade + ")";
				scratch_ctx.fillRect(
					x - xy.x,
					y - xy.y,
					x - xy.x + config.resolution,
					y - xy.y + config.resolution);
			}
		}
		if (draw_to) {
			scratch_ctx.fillStyle = "rgb(" + 255 + "," + 255 + "," + 255 + ")";
			scratch_ctx.font = "20pt arial";
			scratch_ctx.fillText("" + my_session_id,config.block_size / 2,config.block_size / 2);
			draw_to.drawImage(scratch, 0, 0, config.block_size,config.block_size);
		} else {
			ctx.drawImage(scratch, xy.x, xy.y, config.block_size,config.block_size);
		}
	};};
	ret.draw_block_at = function(image, xy) {
		ctx.drawImage(image, xy.x, xy.y);
	}
    return ret;
};
