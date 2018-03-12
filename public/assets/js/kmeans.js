function Dataset(contents, params) {

    this.contents = contents.slice();
    this.points = function() {
        var li = [];
        for (var i = 0; i < this.contents.length; i++) {
            li.push(this.contents[i].point.slice());
        }
        return li;
    }
    this.params = params;
    for (var i = 0; i < this.contents.length; i++) {
        this.contents[i].point = getPointFromObject(this.contents[i], params);
        this.contents[i].params = params;
        this.contents[i].cluster_steps = [];
    }
    this.dimension = params.length;
    this.size = function() {
        return this.contents.length;
    }
    this.getObject = function(i) {
        return this.contents[i];
    }

    this.getPoint = function(i) {
        return this.contents[i].point;
    }

    this.addObject = function(obj) {
        obj.point = getPointFromObject(obj, params);
        obj.params = this.params;
        obj.cluster_steps = [];
        this.contents.push(obj);
    }

    function getPointFromObject(obj, params) {
        var point = [];
        for (var i = 0; i < params.length; i++) {
            point.push(obj[params[i]])
        }
        return point;
    }

    this.reset = function() {
        for(var i =0; i < this.contents.length; i++) {
            this.contents[i].cluster_steps = [];
        }
    }
}

function Cluster(dataset, centroid) {
    this.dataset = dataset;
    this.centroid = centroid;
    this.indices = [];

    this.addIndex = function(i) {
        if (this.indices.indexOf(i) == -1) {
            this.indices.push(i);
        }
    };

    this.clear = function() {
        this.indices = [];
    };

    this.points = function() {
        var contents = [];
        for (var i = 0; i < this.indices.length; i++) {
            contents.push(dataset.getPoint(this.indices[i]));
        }
        return contents;
    }

    this.distance = function(point) {
        var sum = 0;
        for (var i = 0; i < point.length; i++) {
            sum += Math.pow(this.centroid[i] - point[i], 2);
        };
        return Math.sqrt(sum);
    }

    this.updateCentroid = function() {
        if (this.indices.length == 0) {
            return true;
        };
        var new_centroid = [];
        for (var i = 0; i < this.dataset.dimension; i++) {
            var sum = 0;
            var points = this.points();
            for (var j = 0; j < points.length; j++) {
                sum += points[j][i];
            }
            new_centroid.push((sum * 1.0) / (this.indices.length))
        };
        var old_centroid = this.centroid.slice();
        this.centroid = new_centroid;
        var epsilon = 0.000001;
        for (var i = 0; i < this.dataset.dimension; i++) {
            if (Math.abs(old_centroid[i] - new_centroid[i]) > epsilon) {
                return false;
            }
        };
        return true;
    }
}

function ClusterGroup(dataset, k, centroids = []) {
    this.dataset = dataset;
    this.k = k;

    this.clusters = [];
    if (centroids.length == 0) {
        this.centroids = getRandomSubarray(this.dataset.points(), k);
    } else {
        this.centroids = centroids;
    }

    for (var i = 0; i < this.centroids.length; i++) {
        this.clusters.push(new Cluster(this.dataset, this.centroids[i]));
    };

    this.nearest_cluster = function(obj) {
        var nearest = this.clusters[0];
        var smallest_distance = this.clusters[0].distance(obj.point);
        for (var i = 0; i < this.clusters.length; i++) {
            var cluster = this.clusters[i];
            var dist = cluster.distance(obj.point);
            if (dist < smallest_distance) {
                smallest_distance = dist;
                nearest = cluster;
            }
        }
        return nearest;
    };

    this.partition = function() {
        for (var i = 0; i < this.clusters.length; i++) {
            this.clusters[i].clear();
        }

        for (var i = 0; i < this.dataset.size(); i++) {
            this.nearest_cluster(this.dataset.contents[i])
                .addIndex(i);
        }
    };

    this.update = function() {
        var unchanged = true;

        for (var i = 0; i < this.clusters.length; i++) {
            if (!this.clusters[i].updateCentroid()) {
                unchanged = false
            }
        }
        return unchanged
    };

    this.step = function() {
        this.partition();
        return this.update();
    };

    this.addObjects = function(objects) {    
        for (var i = 0; i < objects.length; i++) {
            this.dataset.addObject(objects[i]);
        }
        dataset.reset();
        this.partition();
    }

    this.addObject = function(object) {
        this.dataset.addObject(object);
        dataset.reset();
        this.partition();
    }


    function getRandomSubarray(arr, size) {
        var shuffled = arr.slice(0),
            i = arr.length,
            min = i - size,
            temp, index;
        while (i-- > min) {
            index = Math.floor((i + 1) * Math.random());
            temp = shuffled[index];
            shuffled[index] = shuffled[i];
            shuffled[i] = temp;
        }
        return shuffled.slice(min);
    };
}

function Step(clustergroup) {
    this.contents = [];
    for(var i = 0; i < clustergroup.dataset.contents.length; i++) {
        var item = clustergroup.dataset.contents[i];
        for(var j = 0; j < clustergroup.clusters.length; j++) {
            if(clustergroup.clusters[j].indices.indexOf(i) > -1) {
                item.cluster_steps.push(j);
                item.cluster = j;
            }
        }
        this.contents.push(item);
    }
    this.centroids = [];
    for(var j = 0; j < clustergroup.clusters.length; j++) {
        this.centroids.push(clustergroup.clusters[j].centroid.slice());
    }
}

Step.prototype.diff = function(step) {
    var contents = [];
    for (var i = 0; i < this.contents.length; i++) {
        if (step.contents.indexOf(this.contents[i]) == -1) {
            contents.push(this.contents[i]);
        }
    }
    return contents;
}

function run(clustergroup, maxstep) {
    var steps = []
    for (var i = 0; i < maxstep; i++) {
        var finished = clustergroup.step();
        steps.push(new Step(clustergroup));
        if (finished) {
            break;
        }
    }
    var result = new Object();
    result.steps = steps;
    result.clustergroup = clustergroup;
    return result;
};

function kmeans(data, params, k, maxstep) {
    var dataset = new Dataset(data, params);
    var clustergroup = new ClusterGroup(dataset, k, []);
    return run(clustergroup, maxstep);
}