function findPlaces(placeType) {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
  
        const location = new google.maps.LatLng(lat, lng);
        const request = {
          location: location,
          radius: '5000',
          type: [placeType]
        };
  
        const service = new google.maps.places.PlacesService(document.createElement('div'));
        service.nearbySearch(request, (results, status) => showResults(results, status, placeType));
      });
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  }
  
  function showResults(results, status, placeType) {
    const container = document.getElementById("results");
    container.innerHTML = `<h2>Nearby ${placeType === 'hospital' ? 'Hospitals' : 'Police Stations'}</h2>`;
  
    if (status === google.maps.places.PlacesServiceStatus.OK) {
      results.forEach(place => {
        const div = document.createElement("div");
        div.className = "place";
        div.innerHTML = `
          <strong>${place.name}</strong><br>
          ${place.vicinity}<br>
          ${place.rating ? `⭐ ${place.rating}` : ''}
        `;
        container.appendChild(div);
      });
    } else {
      container.innerHTML += `<p>No ${placeType} found nearby.</p>`;
    }
  }