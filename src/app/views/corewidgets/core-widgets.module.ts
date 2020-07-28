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
import { UserIndexComponent } from './components/user-index/user-index.component';
import { UserInfoComponent } from './components/user-info/user-info.component';
import { MapComponent } from './components/map/map-index.component';
import { MapViewComponent } from './components/map-view/map-view.component';
import { FaqIndexComponent } from './components/faq-index/faq-index.component';
import { FaqInfoComponent } from './components/faq-info/faq-info.component';
import { FaqListComponent } from './components/faq-list/faq-list.component';
import { PostIndexComponent } from './components/post-index/post-index.component';
import { PostInfoComponent } from './components/post-info/post-info.component';
import { PostDataComponent } from './components/post-data/post-data.component';
import { EmailThreadsComponent } from './components/email-threads/email-threads.component';
import { EmailComposeComponent } from './components/email-compose/email-compose.component';
import { EmailTemplatesIndexComponent } from './components/etemplates-index/etemplates-index.component';
import { EmailTemplatesInfoComponent } from './components/etemplates-info/etemplates-info.component';
import { OrgIndexComponent } from './components/org-index/org-index.component';
import { OrgInfoComponent } from './components/org-info/org-info.component';
import { DashboardIndexComponent } from './components/dashboard-index/dashboard-index.component';
import { OrgRequestComponent } from './components/org-request/org-request';
import { NgxCommentoComponent } from './components/comment.component';
import { KitComponent } from './components/kit-component/kit-component.component';
const routes: Routes = [
  { path: '', component: DashboardIndexComponent },
  { path: 'donate-device', component: DonorRequestComponent },
  { path: 'volunteer', component: VolunteerComponent },
  { path: 'faqs', component: FaqListComponent },
  { path: 'organisation-device-request', component: OrgRequestComponent},
  { path: 'dashboard/map', component: MapViewComponent},
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
  { path: 'dashboard/faqs', component: FaqIndexComponent,  canActivate: [AuthGuard] },
  {
    path: 'dashboard/faqs/:faqId', component: FaqInfoComponent,  canActivate: [AuthGuard]
  },
  { path: 'dashboard/posts', component: PostIndexComponent,  canActivate: [AuthGuard] },
  {
    path: 'dashboard/posts/:postId', component: PostInfoComponent,  canActivate: [AuthGuard]
  },
  {
    path: 'dashboard/email', component: EmailComposeComponent, canActivate: [AuthGuard]
  },
  {
    path: 'dashboard/email/templates', component: EmailTemplatesIndexComponent, canActivate: [AuthGuard]
  },
  {
    path: 'dashboard/email/templates/:templateId', component: EmailTemplatesInfoComponent,  canActivate: [AuthGuard]
  },
  {
    path: 'dashboard/organisations', component: OrgIndexComponent, canActivate: [AuthGuard]
  },
  {
    path: 'dashboard/organisations/:orgId', component: OrgInfoComponent, canActivate: [AuthGuard]
  },
  { path: 'dashboard', component: DashboardIndexComponent, canActivate: [AuthGuard]},
  { path: 'about-us', component: PostDataComponent},
  { path: '**', component: PostDataComponent},
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
    UserIndexComponent,
    UserInfoComponent,
    MapComponent,
    MapViewComponent,
    FaqIndexComponent,
    FaqInfoComponent,
    FaqListComponent,
    PostIndexComponent,
    PostInfoComponent,
    PostDataComponent,
    EmailThreadsComponent,
    EmailComposeComponent,
    EmailTemplatesIndexComponent,
    EmailTemplatesInfoComponent,
    OrgIndexComponent,
    OrgInfoComponent,
    DashboardIndexComponent,
    OrgRequestComponent,
    NgxCommentoComponent,
    KitComponent
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
