import { Component, Input } from '@angular/core';
@Component({
    selector: 'app-initial',
    styleUrls: ['./app-initial.scss'],
    template: `
    <svg  class="img" xmlns="http://www.w3.org/2000/svg" 
        pointer-events="none" 
        [style.width]="width" 
        [style.height]="height"
        [style.background-color]="color"
    >
        <text 
            text-anchor="middle" 
            x="50%" 
            y="50%" 
            dy="0.35em" 
            pointer-events="auto"
            [attr.fill]="fill"
        >
            {{initial}}
        </text>    
    </svg>
`
})
export class AppInitialComponent {
    constructor() { }

    initial = "";
    color = "#9400d3";

    @Input()
    width = '50px';

    @Input()
    height = '50px';

    fill = "#333333";

    private _name: string = '';
    @Input()
    set name(str: string) {
        str = str || "";
        this._name = str;
        var st = str.split(" ").filter(t => t && t.length).map(t => t.charAt(0).toUpperCase());
        if (st.length == 1 && str.length > 1) {
            st.push(str.charAt(1))
        }

        this.initial = this.unicodeSlice(st.join(""), 0, st.length).toUpperCase();
        let salt = 0;
        for (let i = 0; i < str.length; i++) {
            salt = salt + str.charCodeAt(i)
        }
        let colorIndex = Math.floor((salt) % this.colors.length);
        this.color = this.colors[colorIndex] || "#9400d3";
        if (this.lightOrDark(this.color) == "dark") {
            this.fill = "#FFFFFF";
        }
    }

    get name() {
        return this._name;
    }

    @Input()
    colors: string[] = [
        "#00ffff", "#f0ffff", "#f5f5dc", "#000000", "#0000ff", "#a52a2a", "#00ffff", "#00008b", "#008b8b",
        "#a9a9a9", "#006400", "#bdb76b", "#8b008b", "#556b2f", "#ff8c00", "#9932cc", "#8b0000", "#e9967a",
        "#9400d3", "#ff00ff", "#ffd700", "#008000", "#4b0082", "#f0e68c", "#add8e6", "#e0ffff", "#90ee90",
        "#d3d3d3", "#ffb6c1", "#ffffe0", "#00ff00", "#ff00ff", "#800000", "#000080", "#808000", "#ffa500",
        "#ffc0cb", "#800080", "#800080", "#ff0000", "#c0c0c0",
        "#1abc9c", "#16a085", "#f1c40f", "#f39c12", "#2ecc71", "#27ae60", "#e67e22", "#d35400",
        "#3498db", "#2980b9", "#e74c3c", "#c0392b", "#9b59b6", "#8e44ad", "#bdc3c7", "#34495e", "#2c3e50",
        "#95a5a6", "#7f8c8d", "#ec87bf", "#d870ad", "#f69785", "#9ba37e", "#b49255", "#b49255", "#a94136"
    ];

    private unicodeCharAt(str: string, index: number) {
        var first = str.charCodeAt(index);
        var second;
        if (first >= 0xD800 && first <= 0xDBFF && str.length > index + 1) {
            second = str.charCodeAt(index + 1);
            if (second >= 0xDC00 && second <= 0xDFFF) {
                return str.substring(index, index + 2);
            }
        }
        return str[index];
    }

    private unicodeSlice(str: string, start: number, end: number) {
        var accumulator = "";
        var character;
        var stringIndex = 0;
        var unicodeIndex = 0;
        var length = str.length;

        while (stringIndex < length) {
            character = this.unicodeCharAt(str, stringIndex);
            if (unicodeIndex >= start && unicodeIndex < end) {
                accumulator += character;
            }
            stringIndex += character.length;
            unicodeIndex += 1;
        }

        return accumulator;
    }

    private lightOrDark(color) {
        // Variables for red, green, blue values
        var r, g, b, hsp;

        // Check the format of the color, HEX or RGB?
        if (color.match(/^rgb/)) {

            // If HEX --> store the red, green, blue values in separate variables
            color = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*(\d+(?:\.\d+)?))?\)$/);

            r = color[1];
            g = color[2];
            b = color[3];
        }
        else {

            // If RGB --> Convert it to HEX: http://gist.github.com/983661
            color = +("0x" + color.slice(1).replace(
                color.length < 5 && /./g, '$&$&'));

            r = color >> 16;
            g = color >> 8 & 255;
            b = color & 255;
        }

        // HSP (Highly Sensitive Poo) equation from http://alienryderflex.com/hsp.html
        hsp = Math.sqrt(
            0.299 * (r * r) +
            0.587 * (g * g) +
            0.114 * (b * b)
        );

        // Using the HSP value, determine whether the color is light or dark
        if (hsp > 127.5) {

            return 'light';
        }
        else {

            return 'dark';
        }
    }

}

