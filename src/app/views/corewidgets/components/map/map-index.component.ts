import { Component, ViewChild, Inject, Renderer2, Input } from '@angular/core';
import { DOCUMENT } from '@angular/common';

function _window(): any {
  return window;
}

@Component({
  selector: 'map-index',
  styleUrls: ['map-index.scss'],
  templateUrl: './map-index.html'
})
export class MapComponent {
  lat = 51.678418;
  lng = 7.809007;
  @ViewChild('mapRef') mapRef: any;
  map: google.maps.Map;
  _center: any = {
    lat: 51.4289925,
    lng: -0.144655
  };

  _activeMarkers: Array<any> = [];

  @Input()
  set markers(markers: any) {
    this._activeMarkers.forEach(m => {
      m.setMap(null);
    });
    this._activeMarkers = [];

    markers.forEach(m => {
        const infowindow = new google.maps.InfoWindow({
            content: m.info
        });
        const marker = new google.maps.Marker({
            position: m.position,
            title: m.title,
            map: this.map,
            icon: m.icon
        });
        marker.addListener('click', () => {
            infowindow.open(this.map, marker);
        });
        this._activeMarkers.push(marker);
    });
  }

  @Input()
  set center(val: any) {
    this._center = val;
    if (this.map) {
        this.map.setCenter(this._center);
    }
  }

  ngOnInit() {
    this.initMap();
  }

  initMap() {
    this.map = new google.maps.Map(document.getElementById('map'), {
      zoom: 12,
      mapTypeControl: false,
      streetViewControl: false,
      center: this._center
    });
  }

  constructor(
    @Inject(DOCUMENT) private document: Document,
    private renderer2: Renderer2
  ) {}

  private loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = this.renderer2.createElement('script');
      script.type = 'text/javascript';
      script.src = url;
      script.text = ``;
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = reject;
      this.renderer2.appendChild(this.document.body, script);
    });
  }
}
