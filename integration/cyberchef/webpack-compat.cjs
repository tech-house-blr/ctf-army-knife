/* Apply to the isolated upstream build, without changing its operation source. */
module.exports = function configurePortableRules(config) {
    function condition(value) {
        if (Object.prototype.toString.call(value) === "[object RegExp]") {
            return (resource) => value.test(resource.replaceAll("\\", "/"));
        }
        if (Array.isArray(value)) return value.map(condition);
        if (value && typeof value === "object") {
            return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, condition(item)]));
        }
        return value;
    }

    for (const rule of config.module.rules) {
        // These loaders inject JavaScript globals. They must never run on the
        // CSS, images, or other assets shipped inside those packages.
        if (rule.loader === "imports-loader") {
            const original = rule.test;
            rule.test = (resource) => /\.m?js$/.test(resource) && original.test(resource.replaceAll("\\", "/"));
        }
        for (const key of ["test", "include", "exclude"]) {
            if (rule[key]) rule[key] = condition(rule[key]);
        }
    }
    return config;
};
