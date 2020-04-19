import { Component, ViewChild } from '@angular/core';

@Component({
  selector: 'map-index',
  styleUrls: ['map-index.scss'],
  templateUrl: './map-index.html'
})
export class MapComponent {
  lat: number = 51.678418;
  lng: number = 7.809007;
  @ViewChild('mapRef') mapRef: any;
  ngAfterViewInit() {
    console.log('Map', this.mapRef.nativeElement)
    const map = new google.maps.Map(this.mapRef.nativeElement, {
        center: {lat: -34.397, lng: 150.644},
        zoom: 8
    });
  }
}
