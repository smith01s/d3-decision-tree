import json
import numpy as np


def to_dict(tree, encoders=None, feature_names=None, class_names=None):
    def _recurse(tree, node):
        threshold = tree.threshold[node]
        feature = tree.feature[node]

        l = tree.children_left[node]
        r = tree.children_right[node]

        # create JSON representation for each node
        fmt = {
            "metrics": {
                "purity": 1 - float(tree.impurity[node]),
                "n_samples": int(tree.n_node_samples[node])
            }
        }

        if l >= 0 or r >= 0:
            fmt["children"] = []
        if l >= 0:
            fmt["children"].append(_recurse(tree, l))
        if r >= 0:
            fmt["children"].append(_recurse(tree, r))

        # inverse-transform categorical feature labels
        if encoders is not None:
            if feature >= 0:
                t = int(np.ceil(threshold))
                fmt["rule"] = {
                    "feature": feature_names[feature],
                    "operator": "<=",
                    "threshold": encoders[feature].inverse_transform(t)
                }

            if class_names is not None:
                cls_index = np.argmax(tree.value[node])
                fmt["class"] = class_names[cls_index]
        return fmt
    return _recurse(tree, 0)


def to_json(tree, encoders=None, feature_names=None, class_names=None):
    d = to_dict(
        tree,
        encoders=encoders,
        feature_names=feature_names,
        class_names=class_names
    )
    return json.dumps(d, indent=4, sort_keys=True)
