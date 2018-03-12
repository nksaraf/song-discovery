var song_info = [];
var playlists = [];

$("#js-login").on('click', function() {
    var client_id = '6465a3c730b04d928034d2ac04162701';
    var redirect_uri = 'https://songdiscovery582.firebaseapp.com/';
    var url = 'https://accounts.spotify.com/authorize';
    url += '?response_type=token';
    url += '&client_id=' + encodeURIComponent(client_id);
    url += '&redirect_uri=' + encodeURIComponent(redirect_uri);
    url += '&show_dialog=' + encodeURIComponent(true);
    window.location = url;
  });

var searchSongs = function(query) {
  $.ajax({
    url: 'https://api.spotify.com/v1/search',
    data: {
      q: query,
      type: 'track',
      limit: 5
    },
    success: function(response) {
      $('#js-results').empty();
      songarray = [];

      $.each(response.tracks.items, function(index) {
        var song = this.name;
        var artist = this.artists[0].name;
        var id = this.id;

        console.log('this');

        $('#js-results').append("<p id='js-song-link' class='query-result' data-id=" + id + ">" + song + " by " + artist + "</p><br>");
      });
    }
  });
};


function getAuth() {
  var hash = window.location.hash;
  var i = hash.indexOf('=');
  var j = hash.indexOf('&');
  var accessToken = hash.substring(i + 1, j);
  return accessToken;
}

function isAuth() {
  return (window.location.hash != "") ? true : false;
}

var getSong = function(id) {
  var token = getAuth();

  $.ajax({
    url: "https://api.spotify.com/v1/tracks/" + id,
    headers: {
      'Authorization': 'Bearer ' + token
    },
    success: function(response) {
      song_info.push(response);
    }
  });
}

var getUser = function() {
    var token = getAuth();

    $.ajax({
      url: 'https://api.spotify.com/v1/me',
      headers: {
        'Authorization': 'Bearer ' + token
      },
      success: function(response) {
        $('#js-welcome').html("<p>Welcome " + response.id + "</p>");
      }
    })
  }

var getPlaylists = function() {
  var token = getAuth();

  $.ajax({
    url: 'https://api.spotify.com/v1/me/playlists',
    headers: {
      'Authorization': 'Bearer ' + token
    },
    success: function(response) {

      $.each(response.items, function(index) {
        var name = this.name;
        var id = this.id;
        var owner = this.owner.id;
        $('#js-show-playlists').append("<p id='js-playlist-link' class='query-result' data-owner='" + owner + "' data-id='" + id + "'>" + name + "</p><br>");
      });
    }
  })
}

var getSingleAudioData = function(id, params, k) {
  song_info = [];
  var token = getAuth();
    $.ajax({
          url: "https://api.spotify.com/v1/tracks/" + id,
          headers: {
            'Authorization': 'Bearer ' + token
          },
          success: function(song_i) {
            song_info.push(song_i);
             $.ajax({
              url: 'https://api.spotify.com/v1/audio-features/' + id,
              headers: {
                'Authorization': 'Bearer ' + token
              },
              success: function(response) {
                var songData = response;
                songData.name = song_info[0].name;
                songData.artist = song_info[0].artists[0].name;
                songData.playback_url = song_info[0].preview_url;
                songData.user_data = true;
                songData.recommended = false;
                updateClusters(songData, params, k);
                drawClustersAllSteps();
              }
            });
          }
        });
  song_info = []
}
var getAudioData = function(ids, params, k) {
  song_info = [];
  var idStr = "";
  for (var i = 0; i < ids.length; i++) {
    if (i != ids.length) {
      idStr = idStr + ids[i] + ",";
    } else {
      idStr = idStr + ids[i];
    }
  }

  $.each(ids, function(i) {
    getSong(ids[i]);
  });

  var token = getAuth();

  $.ajax({
    url: 'https://api.spotify.com/v1/audio-features/?ids=' + idStr,
    headers: {
      'Authorization': 'Bearer ' + token
    },
    success: function(response) {
      var songData = response;
      for (var i = 0; i < songData.audio_features.length; i++) {
        songData.audio_features[i].user_data = true;
        songData.audio_features[i].name = song_info[i].name;
        songData.audio_features[i].artist = song_info[i].artists[0].name;
        songData.audio_features[i].playback_url = song_info[i].preview_url;
        songData.audio_features[i].recommended = false;
      }
      // console.log(JSON.stringify(songData.audio_features));
      // console.log(JSON.stringify(songs));
      updateClusters(songData.audio_features, params, k);
      drawClustersAllSteps();
    }
  });
}

var drawClusters = function(step) {
  if (step >= clusters.steps.length) {
    step = clusters.steps.length - 1;
  }
  var cluster_data = clusters.steps[step].contents;
  var centroids = clusters.steps[step].centroids;
  var k = centroids.length;
  var tooltip = d3.select("div.tooltip");
  var colorScale = d3.scaleOrdinal()
    .domain([0, k - 1])
    .range(colors.slice(0, k));

  var songs_g = s1.select('g.songs');
  var circles_songs = songs_g.selectAll("circle").data(cluster_data);
  var es = circles_songs.enter()
    .append("circle")
    .attr("fill-opacity", "0.6");
  circles_songs.merge(es)
    .attr("cx", function(song) { return xScale(song.point[0]); })
    .attr("cy", function(song) { return yScale(song.point[1]); })
    .attr("stroke", function(song) { return colorScale(song.cluster_steps[step]); })
    .attr("fill", function(song) {
      if(song.user_data) { return colorScale(song.cluster_steps[step]); }
      else {return '#FFFFFF'} })
    .attr("class", function(song) {
      if (song.user_data) { return "testID"+song.cluster; }
      else { return "trainID"+song.cluster; }
    })
    .attr("stroke-width", function(song) {
      if(song.recommended) {return "2";}
      else {return "1";}
    })
    .attr("r", function(song) {
      if(song.recommended) {return "4";}
      else {return "3";}
    })
    .attr("data-url", function(song) { return song.playback_url; }) // adding data so we can
    .attr("data-name", function(song) { return song.name; })        // pull it out for
    .attr("data-artist", function(song) { return song.artist; })
    .attr("data-index", function(song, i) {return i; })   // recommended songs.
    .on("mouseover", function() { return tooltip.style("visibility", "visible"); })
    .on("mousemove", function(song, i) {
      var content = song.name + " by " + song.artist;
      for (var i = 0; i < song.params.length; i++) {
        content += "<br> " + song.params[i] + ": " + song[song.params[i]];
      }
      return tooltip.style("top", (d3.event.pageY - 10) + "px")
        .style("left", (d3.event.pageX + 10) + "px")
        .style("background-color", function() { return colorScale(song.cluster); })
        .html(content);
    })
    .on("mouseout", function() {  return tooltip.style("visibility", "hidden"); });
  circles_songs.exit().remove();

  var cent = s1.select('g.centroids');
  var square_centroids = cent.selectAll("rect")
    .data(centroids);
  var ec = square_centroids.enter()
    .append("rect")
    .attr("width", 12)
    .attr("height", 12);
  square_centroids.merge(ec)
    .transition()
    .duration(1000)
    .attr("x", function(point) { return xScale(point[0]) - 6; })
    .attr("y", function(point) { return yScale(point[1]) - 6; })
    .attr("fill", function(point, i) { return colorScale(i); })
    .attr("stroke", function(point, i) { return colorScale(i); });
  square_centroids.exit().remove();

}

var showSongs = function(owner, id, params, k) {
  var token = getAuth();
  var id_list = [];
  if (playlists.indexOf(id) == -1) {
    $.ajax({
      url: "https://api.spotify.com/v1/users/" + owner + "/playlists/" + id + "/tracks",
      headers: {
        'Authorization': 'Bearer ' + token
      },
      success: function(response) {

        $.each(response.items, function(index) {
          var name = this.track.name;
          var id = this.track.id;
          id_list.push(id);
        });

        getAudioData(id_list, params, k);
      }
    });
  }
  song_info = [];
}

function listEquals(list1, list2) {
  if (list1.length != list2.length) return false;
  for (var i = 0; i < list1.length; i++) {
    if (list1[i] != list2[i]) return false;
  }
  return true;
}
