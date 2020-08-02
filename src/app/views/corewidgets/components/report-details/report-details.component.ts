import { Component, Input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';

@Component({
    selector: 'report-details',
    styleUrls: ['report-details.scss'],
  
    templateUrl: './report-details.html'
})
export class ReportDetailsComponent {
    @Input()
    url = ''
}
