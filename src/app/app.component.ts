import { Component } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { RouterNavigation } from '@ngxs/router-plugin';
import { Store, Actions, ofAction } from '@ngxs/store';
import { Subscription } from "rxjs";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  private actionSub: Subscription;

  constructor(
    private toastr: ToastrService,
    private store: Store,
    private actions: Actions
  ) {
  }

  ngOnInit() {
    this.actionSub = this.actions.pipe(ofAction(RouterNavigation)).subscribe(({ event }) => this.handleAction(event));
  }

  handleAction(action) {
    if (action.state && action.state.root && action.state.root.queryParams.advanced) {
      let html = `
        <small>
          <p>We trust you have received the usual lecture from the System Administrator.</p>
          <hr />
          <p>With great power comes great responsibility</p>
        </small>
      `;
      this.toastr.warning(html, 'Advanced Mode Activated', {
        enableHtml: true,
        timeOut: 15000
      })
    }
  }

  ngOnDestroy() {
    if (this.actionSub) {
      this.actionSub.unsubscribe();
    }
  }

}
