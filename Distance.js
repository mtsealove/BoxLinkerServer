exports.GetDistance = function (lat1, lon1, lat2, lon2) {
    var theta = lon1 - lon2;
    var dist = Math.sin(deg2rad(lat1)) * Math.sin(deg2rad(lat2)) + Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.cos(deg2rad(theta));
    dist = Math.acos(dist);
    dist = rad2deg(dist);
    dist = dist * 60 * 1.1515;
    dist = dist * 1609.344;

    return (dist);
}

// This function converts decimal degrees to radians
function deg2rad(deg) {
    return (deg * Math.PI / 180.0);
}

// This function converts radians to decimal degrees
function rad2deg(rad) {
    return (rad * 180 / Math.PI);
}