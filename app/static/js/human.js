function humanNumbers(n) {
    if (n > 1000000000000) {
        n = n/1000000000000.0
        return n.toFixed(2) + " trillion";
    }
    if (n > 1000000000) {
        n = n/1000000000.0
        return n.toFixed(2) + " billion";
    }
    if (n > 1000000) {
        n = n/1000000.0
        return n.toFixed(2) + " million";
    }
    return n.toFixed(0);
}