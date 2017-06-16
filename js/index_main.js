var map;
var defaultIcon;
var highlightedIcon;


// used javascript because in incognito mode jquery is also not loaded. So i have used simple javascript here.
function mapError() {

    var headerVal = document.getElementById("app-header");
    headerVal.innerHTML = "Error:Could not load Google Maps\n" + headerVal.innerHTML;
    document.getElementById("query-list").style.visibility= "hidden";
}

//initializes the map
function initializeMap() {
    "use strict";

    map = new google.maps.Map(document.getElementById('map'), {
        center: {
            lat: 37.338208,
            lng: -121.886329
        },
        zoom: 14,
        mapTypeControl: false
    });
    ko.applyBindings(new KnockoutViewModel());

}

String.prototype.contains = function(other) {
    return this.indexOf(other) !== -1;
};

// View Model
var KnockoutViewModel = function() {
    var self = this;

    function initialize() {
        fetchdine_spots();
    }


    if (typeof google !== 'object' || typeof google.maps !== 'object') {} else {
        defaultIcon = makeMarkerIcon('800080');
        highlightedIcon = makeMarkerIcon('FFFF00');
        var infoWindow = new google.maps.InfoWindow();
        google.maps.event.addDomListener(window, 'load', initialize);
    }
    self.dine_spotsList = ko.observableArray([]);
    self.query = ko.observable('');
    self.queryResult = ko.observable('');


    //Creates a object from the data received by foursquare api
    var SearchObject = function(dine_spots, map) {
        var self = this;
        self.lng = dine_spots.location.lng;
        self.lat = dine_spots.location.lat;
        self.formattedPhone = ko.observable(dine_spots.contact.formattedPhone);
        self.name = ko.observable(dine_spots.name);
        self.map_location = ko.computed(function() {
            if (self.lat === 0 || self.lng === 0) {
                return null;
            } else {
                return new google.maps.LatLng(self.lat, self.lng);
            }
        });
        self.formattedAddress = ko.observable(dine_spots.location.formattedAddress);
        self.marker = (function(dine_spots) {
            var marker;

            if (self.map_location()) {
                marker = new google.maps.Marker({
                    position: self.map_location(),
                    map: map,
                    icon: defaultIcon
                });
            }
            return marker;
        })(self);
        self.id = ko.observable(dine_spots.id);
        self.url = ko.observable(dine_spots.url);
        var url1 = self.url() === undefined ? '#' : self.url();
        var addr = self.formattedAddress() === undefined ? ' ' : self.formattedAddress();
        var phone1 = self.formattedPhone() === undefined ? ' ' : self.formattedPhone();
        console.log(phone1);
        self.formattedInfoWindowData = function() {
            return '<div class="info-window-content">' + '<a href="' + url1 + '">' +
                '<span class="info-window-header"><h4>' + self.name() + '</h4></span>' +
                '</a><h6>' + addr + '<br>' + phone1 + '</h6>' +
                '</div>';
        };
    };


    //List of dine_spots's after filter based on query added in search
    self.filteredDineSpotsList = ko.computed(function() {
        self.dine_spotsList().forEach(function(dine_spots) {
            dine_spots.marker.setMap(null);
        });

        var results = ko.utils.arrayFilter(self.dine_spotsList(), function(dine_spots) {
            return dine_spots.name().toLowerCase().contains(self.query().toLowerCase());
        });

        results.forEach(function(dine_spots) {
            dine_spots.marker.setMap(map);
        });
        if (results.length > 0) {
            self.queryResult(results.length + " food spots from Foursquare ");

        } else {
            self.queryResult("Sorry no such place found");
        }
        return results;
    });
    self.queryResult("Loading......");

    //function called when a dine_spots is clicked from the filtered list
    self.selectdine_spots = function(dine_spots) {
        infoWindow.setContent(dine_spots.formattedInfoWindowData());
        infoWindow.open(map, dine_spots.marker);
        map.panTo(dine_spots.marker.position);
        dine_spots.marker.setAnimation(google.maps.Animation.BOUNCE);
        dine_spots.marker.setIcon(highlightedIcon);
        self.dine_spotsList().forEach(function(unselected_dine_spots) {
            if (dine_spots != unselected_dine_spots) {
                unselected_dine_spots.marker.setAnimation(null);
                unselected_dine_spots.marker.setIcon(defaultIcon);
            }
        });
    };


    function fetchdine_spots() {
        var data;

        $.ajax({
            url: 'https://api.foursquare.com/v2/venues/search',
            dataType: 'json',
            data: 'client_id=HQ53RPBYCWJQPQXK3OY032MRPYK051ST42UFRSV052ONXBFI&client_secret=1EOZYQPKZPCXURLQRMUS0KIHBKJ0RIPITDQJ5XQPJHB3VU53&v=20161016%20&ll=37.338208,-121.886329%20&query=food',
            async: true,
        }).done(function(response) {
            data = response.response.venues;
            data.forEach(function(dine_spots) {
                object = new SearchObject(dine_spots, map);
                self.dine_spotsList.push(object);
            });
            self.dine_spotsList().forEach(function(dine_spots) {
                if (dine_spots.map_location()) {
                    google.maps.event.addListener(dine_spots.marker, 'click', function() {
                        self.selectdine_spots(dine_spots);
                    });
                }
            });
        }).fail(function(response, status, error) {
            $('#display-query-length').text('Sorry.. food spots could not load due to some network issue...');
        });
    }
};

//function to make default and highlighted marker icon using the marker color provided
function makeMarkerIcon(mcolor) {
    var markerImage = new google.maps.MarkerImage(
        'http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|' + mcolor + '|40|_|%E2%80%A2',
        new google.maps.Size(21, 34),
        new google.maps.Point(0, 0),
        new google.maps.Point(10, 34),
        new google.maps.Size(21, 34));
    return markerImage;
}