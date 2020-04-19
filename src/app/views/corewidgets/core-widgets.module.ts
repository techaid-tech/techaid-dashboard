import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Routes, RouterModule } from '@angular/router';
import { AuthGuard } from "@app/shared/services/auth.guard";
import { PicFormModule } from '../../shared/modules/formly';
import { VolunteersIndexComponent } from './components/volunteer-index/volunteer-index.component';
import { VolunteerInfoComponent } from './components/volunteer-info/volunteer-info.component';
import { KitIndexComponent} from './components/kit-index/kit-index.component';
import { UserPermissionsComponent } from './components/user-permissions/user-permissions.component';
import { RoleIndexComponent } from './components/role-index/role-index.component';
import { RoleInfoComponent } from './components/role-info/role-info.component';
import { RolePermissionsComponent } from './components/role-permissions/role-permissions.component';
import { RoleUsersComponent } from './components/role-users/role-users.component';
import { UserRolesComponent } from './components/user-roles/user-roles.component';
import { PicSharedModule } from "@app/shared";
import { AppGridModule } from "@app/shared/modules/grid";
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { NgxsModule } from '@ngxs/store';
import { KitInfoComponent } from './components/kit-info/kit-info.component';
import { DonorIndexComponent } from './components/donor-index/donor-index.component';
import { DonorInfoComponent } from './components/donor-info/donor-info.component';
import { DonorRequestComponent } from './components/donor-request/donor-request.component';
import { LightboxModule } from 'ngx-lightbox';
import { VolunteerComponent } from './components/volunteer/volunteer';
import { CoreWidgetState } from './state/corewidgets.state';
import { IndexComponent, FAQomponent, AboutUsComponent, PrivacyComponent } from './components/static/components';
import { UserIndexComponent } from './components/user-index/user-index.component';
import { UserInfoComponent } from './components/user-info/user-info.component';
import { MapComponent } from './components/map/map-index.component';

const routes: Routes = [
  { path: '', component: IndexComponent },
  { path: 'donate', component: DonorRequestComponent },
  { path: 'volunteer', component: VolunteerComponent },
  { path: 'faqs', component: FAQomponent },
  { path: 'about-us', component: AboutUsComponent },
  { path: 'privacy', component: PrivacyComponent },
  { path: 'dashboard/volunteers', component: VolunteersIndexComponent, canActivate: [AuthGuard] },
  {
    path: 'dashboard/volunteers/:userId', component: VolunteerInfoComponent, canActivate: [AuthGuard]
  },
  { path: 'dashboard/devices', component: KitIndexComponent, canActivate: [AuthGuard] },
  {
    path: 'dashboard/devices/:kitId', component: KitInfoComponent, canActivate: [AuthGuard]
  },
  { path: 'dashboard/donors', component: DonorIndexComponent, canActivate: [AuthGuard] },
  {
    path: 'dashboard/donors/:donorId', component: DonorInfoComponent, canActivate: [AuthGuard]
  },
  { path: 'dashboard/roles', component: RoleIndexComponent,  canActivate: [AuthGuard]},
  {
    path: 'dashboard/roles/:roleId', component: RoleInfoComponent,  canActivate: [AuthGuard]
  },
  { path: 'dashboard/users', component: UserIndexComponent,  canActivate: [AuthGuard] },
  {
    path: 'dashboard/users/:userId', component: UserInfoComponent,  canActivate: [AuthGuard]
  },
];


@NgModule({
  declarations: [
    VolunteersIndexComponent,
    UserPermissionsComponent,
    RoleIndexComponent,
    VolunteerInfoComponent,
    RoleInfoComponent,
    RolePermissionsComponent,
    UserRolesComponent,
    RoleUsersComponent,
    KitIndexComponent,
    KitInfoComponent,
    DonorIndexComponent,
    DonorInfoComponent,
    DonorRequestComponent,
    VolunteerComponent,
    IndexComponent,
    UserIndexComponent,
    UserInfoComponent,
    FAQomponent,
    AboutUsComponent,
    PrivacyComponent,
    MapComponent
  ],
  imports: [
    LightboxModule,
    NgxsModule.forFeature([CoreWidgetState]),
    AppGridModule,
    CommonModule,
    PicSharedModule,
    PicFormModule,
    NgbModule,
    RouterModule.forChild(routes),
  ],
  providers: [
  ],
})
export class CoreWidgetsModule { }
