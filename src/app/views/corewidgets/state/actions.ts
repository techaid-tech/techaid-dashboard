export class SearchQuery {
    static readonly type = '[Auth Server] Search Query';
    constructor(public query: string) { }
}
