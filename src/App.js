import { useEffect, useRef, useState } from "react";

function App() {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [keyword, setKeyword] = useState("打ちっぱなし ゴルフ練習場");
  const markersRef = useRef([]);
  const currentPosRef = useRef(null);
  const [places, setPlaces] = useState([]);
  const infoWindowRef = useRef(null);
  const [showList, setShowList] = useState(false);

  const getAndSetCurrentLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const currentLocation = { lat: latitude, lng: longitude };

        const newMap = new window.google.maps.Map(mapRef.current, {
          center: currentLocation,
          zoom: 15,
        });

        currentPosRef.current = new window.google.maps.Marker({
          position: currentLocation,
          map: newMap,
          title: "現在地",
          icon: {
            url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
          },
        });

        setMap(newMap);
      },
      (error) => {
        console.error("現在地の取得に失敗", error);
      }
    );
  };

  useEffect(() => {
    if (window.google && mapRef.current) {
      getAndSetCurrentLocation();
    }
  }, []);

  useEffect(() => {
    if (map) {
      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];
      infoWindowRef.current = new window.google.maps.InfoWindow();

      const center = map.getCenter();
      const service = new window.google.maps.places.PlacesService(map);

      const request = {
        location: center,
        radius: 5000,
        keyword: keyword,
      };

      service.nearbySearch(request, (results, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK) {
          const filtered = results
            .filter((place) => place.rating)
            .sort((a, b) => b.rating - a.rating);

          setPlaces(filtered);

          filtered.forEach((place, index) => {
            const marker = new window.google.maps.Marker({
              position: place.geometry.location,
              map,
              title: place.name,
            });

            const detailsRequest = {
              placeId: place.place_id,
              fields: ["name", "rating", "opening_hours", "formatted_address"],
            };

            service.getDetails(detailsRequest, (details, status) => {
              if (status === window.google.maps.places.PlacesServiceStatus.OK) {
                const isOpen = details.opening_hours?.open_now;
                marker.setIcon({
                  url: isOpen
                    ? "http://maps.google.com/mapfiles/ms/icons/green-dot.png"
                    : "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
                });

                const content = `
                  <div><strong>${details.name}</strong></div>
                  <div>評価: ${details.rating ?? "不明"}</div>
                  <div>住所: ${details.formatted_address ?? "不明"}</div>
                  <div>営業時間:<br>${
                    details.opening_hours?.weekday_text?.join("<br>") ?? "不明"
                  }</div>
                `;

                marker.addListener("click", () => {
                  infoWindowRef.current.setContent(content);
                  infoWindowRef.current.open(map, marker);
                });

                marker.placeDetails = { ...details, content };
              }
            });

            markersRef.current.push(marker);
          });
        }
      });
    }
  }, [keyword, map]);

  const handleListClick = (index) => {
    const marker = markersRef.current[index];
    if (marker && marker.placeDetails) {
      map.panTo(marker.getPosition());
      infoWindowRef.current.setContent(marker.placeDetails.content);
      infoWindowRef.current.open(map, marker);
      setShowList(false); // スマホなら閉じる
    }
  };

  return (
    <div style={{ height: "100vh", width: "100vw", position: "relative" }}>
      {/* 地図 */}
      <div ref={mapRef} style={{ height: "100%", width: "100%" }} />

      {/* ボタン類 */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          zIndex: 1,
          backgroundColor: "rgba(255,255,255,0.95)",
          padding: "10px",
          borderRadius: "10px",
          boxShadow: "0 0 5px rgba(0,0,0,0.2)",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        <button onClick={() => setKeyword("打ちっぱなし ゴルフ練習場")}>打ちっぱなし</button>
        <button onClick={() => setKeyword("ラーメン")}>ラーメン屋</button>
        <button onClick={getAndSetCurrentLocation}>📍現在地再取得</button>
        <button onClick={() => setShowList((prev) => !prev)}>📋リストを{showList ? "隠す" : "表示"}</button>
      </div>

      {/* リストパネル（スマホ対応） */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: showList ? "50%" : "0",
          overflowY: "auto",
          backgroundColor: "rgba(255,255,255,0.95)",
          transition: "max-height 0.3s ease-in-out",
          zIndex: 2,
          padding: showList ? "10px" : "0 10px",
          borderTop: "1px solid #ccc",
        }}
      >
        {showList &&
          places.map((place, index) => (
            <div
              key={place.place_id}
              onClick={() => handleListClick(index)}
              style={{
                marginBottom: "10px",
                cursor: "pointer",
                borderBottom: "1px solid #ccc",
                paddingBottom: "5px",
              }}
            >
              <strong>{place.name}</strong>
              <div>⭐ {place.rating ?? "不明"}</div>
              <div style={{ fontSize: "0.85em" }}>{place.vicinity}</div>
            </div>
          ))}
      </div>
    </div>
  );
}

export default App;
