const escapeRegex = s => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

export default {
    escapeRegex,
};
