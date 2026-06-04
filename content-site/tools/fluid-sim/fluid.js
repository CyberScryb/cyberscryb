class FluidSolver {
    constructor(N) {
        this.N = N;
        this.size = (N + 2) * (N + 2);
        this.dt = 0.1;
        this.diff = 0.0001;
        this.visc = 0.0001;
        this.u = new Float32Array(this.size);
        this.v = new Float32Array(this.size);
        this.u_prev = new Float32Array(this.size);
        this.v_prev = new Float32Array(this.size);
        this.dens_r = new Float32Array(this.size);
        this.dens_g = new Float32Array(this.size);
        this.dens_b = new Float32Array(this.size);
        this.dens_r_prev = new Float32Array(this.size);
        this.dens_g_prev = new Float32Array(this.size);
        this.dens_b_prev = new Float32Array(this.size);
    }
    IX(i, j) { return i + (this.N + 2) * j; }
    addSource(x, s) { for (let i = 0; i < this.size; i++) x[i] += this.dt * s[i]; }
    setBnd(b, x) {
        const N = this.N;
        for (let i = 1; i <= N; i++) {
            x[this.IX(0, i)]     = b === 1 ? -x[this.IX(1, i)] : x[this.IX(1, i)];
            x[this.IX(N+1, i)]   = b === 1 ? -x[this.IX(N, i)] : x[this.IX(N, i)];
            x[this.IX(i, 0)]     = b === 2 ? -x[this.IX(i, 1)] : x[this.IX(i, 1)];
            x[this.IX(i, N+1)]   = b === 2 ? -x[this.IX(i, N)] : x[this.IX(i, N)];
        }
        x[this.IX(0, 0)]       = 0.5 * (x[this.IX(1, 0)] + x[this.IX(0, 1)]);
        x[this.IX(0, N+1)]     = 0.5 * (x[this.IX(1, N+1)] + x[this.IX(0, N)]);
        x[this.IX(N+1, 0)]     = 0.5 * (x[this.IX(N, 0)] + x[this.IX(N+1, 1)]);
        x[this.IX(N+1, N+1)]   = 0.5 * (x[this.IX(N, N+1)] + x[this.IX(N+1, N)]);
    }
    diffuse(b, x, x0, diff) {
        const N = this.N, a = this.dt * diff * N * N;
        for (let k = 0; k < 20; k++) {
            for (let i = 1; i <= N; i++)
                for (let j = 1; j <= N; j++)
                    x[this.IX(i,j)] = (x0[this.IX(i,j)] + a*(x[this.IX(i-1,j)]+x[this.IX(i+1,j)]+x[this.IX(i,j-1)]+x[this.IX(i,j+1)])) / (1+4*a);
            this.setBnd(b, x);
        }
    }
    advect(b, d, d0, u, v) {
        const N = this.N, dt0 = this.dt * N;
        for (let i = 1; i <= N; i++)
            for (let j = 1; j <= N; j++) {
                let x = i - dt0 * u[this.IX(i,j)], y = j - dt0 * v[this.IX(i,j)];
                x = Math.max(0.5, Math.min(N + 0.5, x));
                y = Math.max(0.5, Math.min(N + 0.5, y));
                const i0 = Math.floor(x), i1 = i0 + 1, j0 = Math.floor(y), j1 = j0 + 1;
                const s1 = x - i0, s0 = 1 - s1, t1 = y - j0, t0 = 1 - t1;
                d[this.IX(i,j)] = s0*(t0*d0[this.IX(i0,j0)]+t1*d0[this.IX(i0,j1)])+s1*(t0*d0[this.IX(i1,j0)]+t1*d0[this.IX(i1,j1)]);
            }
        this.setBnd(b, d);
    }
    project(u, v, p, div) {
        const N = this.N;
        for (let i = 1; i <= N; i++)
            for (let j = 1; j <= N; j++) {
                div[this.IX(i,j)] = -0.5*(u[this.IX(i+1,j)]-u[this.IX(i-1,j)]+v[this.IX(i,j+1)]-v[this.IX(i,j-1)])/N;
                p[this.IX(i,j)] = 0;
            }
        this.setBnd(0, div); this.setBnd(0, p);
        for (let k = 0; k < 20; k++) {
            for (let i = 1; i <= N; i++)
                for (let j = 1; j <= N; j++)
                    p[this.IX(i,j)] = (div[this.IX(i,j)]+p[this.IX(i-1,j)]+p[this.IX(i+1,j)]+p[this.IX(i,j-1)]+p[this.IX(i,j+1)])/4;
            this.setBnd(0, p);
        }
        for (let i = 1; i <= N; i++)
            for (let j = 1; j <= N; j++) {
                u[this.IX(i,j)] -= 0.5*N*(p[this.IX(i+1,j)]-p[this.IX(i-1,j)]);
                v[this.IX(i,j)] -= 0.5*N*(p[this.IX(i,j+1)]-p[this.IX(i,j-1)]);
            }
        this.setBnd(1, u); this.setBnd(2, v);
    }
    velStep() {
        this.addSource(this.u, this.u_prev); this.addSource(this.v, this.v_prev);
        [this.u_prev, this.u] = [this.u, this.u_prev]; this.diffuse(1, this.u, this.u_prev, this.visc);
        [this.v_prev, this.v] = [this.v, this.v_prev]; this.diffuse(2, this.v, this.v_prev, this.visc);
        this.project(this.u, this.v, this.u_prev, this.v_prev);
        [this.u_prev, this.u] = [this.u, this.u_prev];
        [this.v_prev, this.v] = [this.v, this.v_prev];
        this.advect(1, this.u, this.u_prev, this.u_prev, this.v_prev);
        this.advect(2, this.v, this.v_prev, this.u_prev, this.v_prev);
        this.project(this.u, this.v, this.u_prev, this.v_prev);
    }
    densStep(d, d0) {
        this.addSource(d, d0);
        [d0, d] = [d, d0]; this.diffuse(0, d, d0, this.diff);
        [d0, d] = [d, d0]; this.advect(0, d, d0, this.u, this.v);
        return d;
    }
    step() {
        this.velStep();
        this.dens_r = this.densStep(this.dens_r, this.dens_r_prev);
        this.dens_g = this.densStep(this.dens_g, this.dens_g_prev);
        this.dens_b = this.densStep(this.dens_b, this.dens_b_prev);
        this.u_prev.fill(0); this.v_prev.fill(0);
        this.dens_r_prev.fill(0); this.dens_g_prev.fill(0); this.dens_b_prev.fill(0);
    }
    reset() {
        this.u.fill(0); this.v.fill(0); this.u_prev.fill(0); this.v_prev.fill(0);
        this.dens_r.fill(0); this.dens_g.fill(0); this.dens_b.fill(0);
        this.dens_r_prev.fill(0); this.dens_g_prev.fill(0); this.dens_b_prev.fill(0);
    }
}
