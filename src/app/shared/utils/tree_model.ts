export interface NodeType {
    id: string;
    value: any;
    children: Set<Node>;
    parents: Set<Node>;
}

interface TreeDefinition {
    [key: string]: any[];
}

export class Node {
    constructor(public node: NodeType) {
    }

    get parents(): Set<Node> {
        return this.node.parents;
    }

    get id() {
        return this.node.id;
    }

    get value() {
        return this.node.value || this.id;
    }

    get children() {
        return this.node.children;
    }

    descendants(): Node[] {
        let nodes: Node[] = [];
        this.children.forEach(n => {
            nodes.push(n);
            nodes = nodes.concat(n.descendants());
        });

        return Array.from(new Set(nodes));
    }

    ancestors(): Node[] {
        let nodes: Node[] = [];
        let p = this.parents;
        if (p && p.size) {
            p.forEach(n => {
                nodes.push(n);
                nodes = nodes.concat(n.ancestors());
            });
        }

        return Array.from(new Set(nodes));
    }
}

export class Tree {
    private nodes = {};
    constructor(definition: TreeDefinition) {
        definition = definition || {};
        for (let key in definition) {
            let p = this.parseNode(key);
            let parent: Node;

            if (this.nodes[p.id]) {
                parent = this.nodes[p.id];
            } else {
                parent = new Node(p);
                this.nodes[parent.id] = parent;
            }

            definition[key].forEach(n => {
                let nd = this.parseNode(n);
                let node: Node;
                if (this.nodes[nd.id]) {
                    node = this.nodes[nd.id];
                } else {
                    node = new Node(nd);
                    this.nodes[node.id] = node;
                }

                node.node.parents.add(parent);
                parent.children.add(node);
            });
        }
    }

    get roots(): Node[] {
        let roots: Node[] = [];
        for (let id in this.nodes) {
            let node = this.nodes[id];
            if (!node.parents || !node.parents.length) {
                roots.push(node);
            }
        }

        return roots;
    }

    find(id): Node {
        return this.nodes[id];
    }

    private parseNode(node: any): NodeType {
        if (typeof node === 'string') {
            return {
                id: node,
                value: node,
                children: new Set(),
                parents: new Set()
            }
        } else if (typeof node === 'object') {
            let id = node.id || node.key;
            let value = node.value || id;

            if (id === undefined) {
                throw new Error("Unable to locate an id for the specified node");
            }

            return {
                id: id,
                value: value,
                children: new Set(),
                parents: new Set()
            }
        }

        throw new Error(`Dont know how to create node for object of type ${typeof node}`);
    }
}