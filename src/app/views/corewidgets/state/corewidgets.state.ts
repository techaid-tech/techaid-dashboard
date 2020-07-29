import { State, StateContext, Action, Selector, NgxsOnInit } from '@ngxs/store';
import { NgZone, Injectable } from '@angular/core';
import { Apollo } from 'apollo-angular';
import { SearchQuery } from './actions';


export interface CoreWidgetStateModel {
    query: string;
}

@State<CoreWidgetStateModel>({
    name: 'corewidgets',
    defaults: {
        query: ''
    }
})
@Injectable()
export class CoreWidgetState implements NgxsOnInit {
    constructor(private zone: NgZone, private apollo: Apollo) { }

    @Selector() static query(state: CoreWidgetStateModel) {
        return state.query;
    }

    ngxsOnInit(ctx: StateContext<CoreWidgetState>) {

    }

    @Action(SearchQuery)
    setsarchQuery(ctx: StateContext<CoreWidgetStateModel>, action: SearchQuery) {
        ctx.patchState({
            query: action.query
        });
    }
}
