import {
    Component,
    ViewChild,
    ElementRef,
    forwardRef,
    Output,
    Input,
    EventEmitter,
    HostListener,
    ViewEncapsulation
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormControl } from '@angular/forms';
import { FileWidgetService } from '../../services/file-widget.service';
import { Subscription } from 'rxjs';

export class FileValidators {
    static WrongExtensionValidator(extensions : string[]) : (c: FormControl) => any {
        return (c: FormControl) => {
            let value = FileWidgetComponent.normalizeValue(c.value);
            if(extensions && extensions.length && value.name){
                let ext = FileWidgetComponent.extname(value.name);
                if(extensions.indexOf(ext) == -1){
                    return {
                        invalid_extension: `${ext} not in ${extensions.join(',')}`
                    };
                }
            }

            return null;
        }
    }

    static FileSizeValidator(size:number = 0) : (c: FormControl) => any {
        return (c: FormControl) => {
            let val = c.value;
            if(val){
                if((typeof val.size == 'number') && val.size <= size) {
                    return {
                        invalid_size: `${val.size} <= ${size}`
                    };
                }
            }

            return null;
        }
    } 
} 

@Component({
    selector: 'file-widget',
    styleUrls: ['file-widget.scss'],
    templateUrl: 'file-widget.html',
   
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => FileWidgetComponent),
            multi: true
        }
    ]
})
export class FileWidgetComponent implements ControlValueAccessor {
    @ViewChild('fileInput') fileInput: ElementRef;
    @ViewChild('parent', { read: ElementRef }) parent: ElementRef;

    sub: Subscription;

    constructor(
        private fileService: FileWidgetService
    ) { }

    ngOnInit() {
        this.sub = this.fileService.files().subscribe(files => {
            this.updateFileList(files);
        });
    }

    ngOnDestroy() {
        this.sub.unsubscribe();
    }

    ctrl: FormControl = new FormControl();

    files = [];

    @Input()
    key: string = '';

    @Input()
    to: any = {
        placeholder: '',
        warning: {
            message: ''
        },
        retry: () => { }
    }



    @Output()
    file: EventEmitter<any> = new EventEmitter<any>();

    timeout: any = -1;

    private _onChange = (_: any) => { };
    touched = () => { };
    disabled = false;

    @Input('value')
    _value = {};

    file_model: any = {
    };

    get value(): any {
        return this._value;
    }

    set value(file: any) {
        this._value = file;
        this.file_model = FileWidgetComponent.normalizeValue(file);
        this.file.emit(this.file_model);
        this._onChange(this._value);
    }



    changeCycle(type, value) {
        if (type == 'change') {
            if (value && value.widget && value.widget.key && value.widget.key !== this.key) {
                let lv = this.ctrl.value;
                if (lv && lv.widget && (!lv.widget.key || lv.widget.key == this.key)) {
                    this.ctrl.setValue(lv);
                    return;
                }

                this.ctrl.setValue(undefined);
                return;
            }     
            this.addFile(value);
        }
    }

    registerOnChange(fn) {
        this._onChange = fn;
    }

    registerOnTouched(fn) {
        this.touched = fn
    }

    setDisabledState?(isDisabled: boolean) {
        this.disabled = isDisabled;
    }

    writeValue(value: any) {
        this._value = value;
        this.to.warning = {
            message: ''
        };

        if (this.file_model.file) {
            this.file_model.file.widget.key = '';
        }

        this.ctrl.setValue(undefined);
        this.file_model = FileWidgetComponent.normalizeValue(value);
        this.file_model.widget.key = this.key;
        this.updateFileList([]);
    }


    accept() {
        this.value = this._value;
        if (this.to.warning.callback) {
            this.to.warning.callback();
        }

        this.to.warning = {
            message: ''
        };

        this.value = this._value;
    }

    addFile(file: any) {
        if(file && file.is_file_model){
            if(this.file_model !== file){
                this.value = file.original;
            }else{
                this.file_model = file;
                this._value = file.original;
            }

            return;
        }

        var data: any = {
            key: this.key,
            is_file: true,
            name: file.name,
            size: file.size,
            type: file.type,
            file: file
        }
        this.file.emit(data);


        this.touched();
        this.to.warning = {};

        if (this.file_model.file) {
            this.file_model.file.widget.key = '';
        }

        if (this.ctrl.value != file) {
            this.ctrl.setValue(file);
        }

        if (file) {
            let size = FileWidgetComponent.humanFileSize(file.size);

            if (!file.widget) {
                file.widget = {
                    options: {},
                    fields: {},
                    human_size: '',
                    key: this.key
                };
            }

            file.widget.human_size = size;
            file.widget.key = this.key;


            this.value = {
                name: file.name,
                size: file.size,
                human_size: size,
                class: FileWidgetComponent.extclass(file.name),
                file: file
            };
        }
    }

    fileChange(event: any) {
        var file = event.target.files[0];
        this.addFile(file);
    }

    updateFileList(list) {
        if (!list) {
            return;
        }

        const key = this.key;
        let value = this.ctrl.value;
        let new_value = null;
        let files = {};

        if (this.file_model && this.file_model.name) {
            files[this.file_model.name] = this.file_model;
        }

        this.files.forEach(f => {
            files[f.name] = f;
        });

        for (let i = 0; i < list.length; i++) {
            let f = list[i];
            if (!f.widget) {
                f.widget = {
                    options: {},
                    fields: {},
                    size: f.size,
                    human_size: FileWidgetComponent.humanFileSize(f.size),
                    key: key
                };
            }

            files[f.name] = f;
            if (value && value.name == f.name && value !== f) {
                new_value = f;
            }
        }

        if (value && !new_value && !files[value.name]) {
            files[value.name] = value;
        }

        let fileList = [];
        for (let name in files) {
            fileList.push(files[name]);
        }

        if (this.file_model && this.file_model.name && fileList.length == 1) {
            fileList = [];
        }

        
        const ldist = {};
        let match = this.to.match;
        if (match && match.name) {
            let cmp = FileWidgetComponent.normalize(match.name);
            fileList.forEach(f => {
                let filVal = FileWidgetComponent.normalize(f.name);
                ldist[f.name] = FileWidgetComponent.lavenshtein(cmp, filVal.substring(0, cmp.length));
                if(match.alternatives && match.alternatives.length){
                    match.alternatives.forEach(m => {
                        let cp = FileWidgetComponent.normalize(m);
                        let v = FileWidgetComponent.lavenshtein(cp, filVal.substring(0, cp.length));

                        if(v < ldist[f.name]){
                            ldist[f.name] = v;
                        }
                    });
                }
            });

            fileList = fileList.sort((a, b) => {
                return (ldist[a.name] - match.limit) - (ldist[b.name] - match.limit);
            });
        }

        if (this.file_model && this.file_model.name) {
            this.ctrl.setValue(files[this.file_model.name]);
        }


        this.files = fileList;
        if (new_value) {
            this.addFile(new_value);
        }

    
        if (!this.file_model.name && match && (typeof match.limit === 'number') && this.files.length) {
            let f = this.files[0];
            if (f && typeof ldist[f.name] !== undefined && (!f.widget || !f.widget.key)) {
                if (ldist[f.name] <= match.limit) {
                    this.addFile(f);
                }
            }
        }
    }

    dropFile(event: any) {
        event.preventDefault();
        event.stopPropagation();

        if (event.dataTransfer) {
            if (event.dataTransfer.files.length) {
                this.updateFileList(event.dataTransfer.files);
                this.addFile(event.dataTransfer.files[0]);
            }
        }

        return this.dropLeave(event);
    }

    dropEnter(event: any): boolean {
        event.preventDefault();
        event.stopPropagation();
        this.parent.nativeElement.classList.add('file-enter');
        clearTimeout(this.timeout);
        var self = this;
        this.timeout = setTimeout(function () {
            self.dropLeave(event);
        }, 1000);

        return false;
    }

    dropLeave(event: any): boolean {
        event.preventDefault();
        event.stopPropagation();
        this.parent.nativeElement.classList.remove('file-enter');
        clearTimeout(this.timeout);
        return false;
    }

    removeFile() {
        if (this.file_model.file) {
            this.file_model.file.widget.key = '';
        }
        this.value = undefined;
        this.ctrl.setValue(undefined);
        delete this.to.retry;
    }

    /**
     *  File modification methods
     */


    static normalizeValue(file) {
        let original = file;

        if (typeof file == 'string') {
            file = { name: file, size: 0 };
        } else if (!file) {
            file = { size: 0, name: '' };
        }

        let path = FileWidgetComponent.basename(file.path || file.uri || file.url || file.name);
        let size =  FileWidgetComponent.humanFileSize(file.size);
        return {
            name: this.basename(path),
            size: file.size,
            human_size: size,
            class: FileWidgetComponent.extclass(path),
            file: file.file,
            is_file_model: true,
            original: original,
            widget: {
                options: {},
                fields: {},
                size: file.size,
                human_size: size
            }
        }

    }

    static normalize(str: String) {
        if (!str) {
            str = "";
        }
        str = str.trim().toLowerCase().replace(/(.*)\.[^\s\-_]+$/, '$1').replace(/[^a-z0-9\.]+/g, ' ').replace(/\s\s+/g, ' ');
        return str.split(' ').filter(s => s.trim().match(/(^[a-z]+$)|(^[0-9]+$)/)).join(' ').trim();
    }

    static lavenshtein(a, b) {
        if (a.length == 0) return b.length;
        if (b.length == 0) return a.length;

        // swap to save some memory O(min(a,b)) instead of O(a)
        if (a.length > b.length) {
            var tmp = a;
            a = b;
            b = tmp;
        }

        var row = [];
        // init the row
        for (var i = 0; i <= a.length; i++) {
            row[i] = i;
        }

        // fill in the rest
        for (var i = 1; i <= b.length; i++) {
            var prev = i;
            for (var j = 1; j <= a.length; j++) {
                var val;
                if (b.charAt(i - 1) == a.charAt(j - 1)) {
                    val = row[j - 1]; // match
                } else {
                    val = Math.min(row[j - 1] + 1, // substitution
                        prev + 1,     // insertion
                        row[j] + 1);  // deletion
                }
                row[j - 1] = prev;
                prev = val;
            }
            row[a.length] = prev;
        }

        return row[a.length];
    }


    static humanFileSize(bytes): string {
        var thresh = 1000;
        if (Math.abs(bytes) < thresh) {
            return bytes + ' B';
        }
        var units = ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        var u = -1;
        do {
            bytes /= thresh;
            ++u;
        } while (Math.abs(bytes) >= thresh && u < units.length - 1);

        return bytes.toFixed(1) + ' ' + units[u];
    }

    static basename(path: string, ext?: string): string {
        let input =  (path || '').trim().replace(/.*\/([^\/]+)/, '$1');
        if(ext){
            input = input.replace(`.${ext}`, '').replace(ext, '');
        }
        return input;
    }

    static extname(path: string): string {
        path = this.basename(path);
        if(path.match(/.+\.[^\.]+$/)){
            return (path || '').replace(/.*\.([^\.]+)$/, '$1').toLowerCase();
        }else{
            return "";
        }
    }

    static extclass(path: string): string {
        var types = {
            'txt|text|log': 'fa-file-text-o',
            'jpg|jpeg|bmp|gif|bmp': 'fa-file-photo-o',
            'doc|docx|rtf': 'fa-file-word-o',
            'zip|tar|xz|7zip': 'fa-file-zip-o',
            'mp4|mpeg|avi|divx|mkv': 'fa-file-movie-o',
            'pdf': 'fa-file-pdf-o',
            'xls|xlsx|xlsm|xlsb|csv|psv': 'fa-file-excel-o',
            'bin|exe|jar|o|html|js|rb|c|java|yml|yaml|json|xml': ' fa-file-code-o',
            'ppt|pptx': 'fa-file-powerpoint-o'
        };

        var type = "fa-file-o";
        var ext = this.extname(path);

        for (let k in types) {
            if (k.indexOf(ext) > -1) {
                type = types[k];
                break;
            }
        }

        return type;
    }
}
