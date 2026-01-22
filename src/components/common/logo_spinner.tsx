interface LogoSpinnerProps {
    size?: number;
    class?: string;
}

export function LogoSpinner({ size = 24, class: className }: LogoSpinnerProps) {
    return (
        <svg
            class={className}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            style={{ opacity: 0.5 }}
        >
            <defs>
                <mask id="ls-mask">
                    <rect class="ls_0_0" x="0" y="0" width="4" height="4" fill="white" />
                    <rect class="ls_0_1" x="4" y="0" width="4" height="4" fill="white" />
                    <rect class="ls_0_2" x="8" y="0" width="4" height="4" fill="white" />
                    <rect class="ls_0_3" x="12" y="0" width="4" height="4" fill="white" />
                    <rect class="ls_0_4" x="16" y="0" width="4" height="4" fill="white" />
                    <rect class="ls_0_5" x="20" y="0" width="4" height="4" fill="white" />
                    <rect class="ls_1_0" x="0" y="4" width="4" height="4" fill="white" />
                    <rect class="ls_1_1" x="4" y="4" width="4" height="4" fill="white" />
                    <rect class="ls_1_2" x="8" y="4" width="4" height="4" fill="white" />
                    <rect class="ls_1_3" x="12" y="4" width="4" height="4" fill="white" />
                    <rect class="ls_1_4" x="16" y="4" width="4" height="4" fill="white" />
                    <rect class="ls_1_5" x="20" y="4" width="4" height="4" fill="white" />
                    <rect class="ls_2_0" x="0" y="8" width="4" height="4" fill="white" />
                    <rect class="ls_2_1" x="4" y="8" width="4" height="4" fill="white" />
                    <rect class="ls_2_2" x="8" y="8" width="4" height="4" fill="white" />
                    <rect class="ls_2_3" x="12" y="8" width="4" height="4" fill="white" />
                    <rect class="ls_2_4" x="16" y="8" width="4" height="4" fill="white" />
                    <rect class="ls_2_5" x="20" y="8" width="4" height="4" fill="white" />
                    <rect class="ls_3_0" x="0" y="12" width="4" height="4" fill="white" />
                    <rect class="ls_3_1" x="4" y="12" width="4" height="4" fill="white" />
                    <rect class="ls_3_2" x="8" y="12" width="4" height="4" fill="white" />
                    <rect class="ls_3_3" x="12" y="12" width="4" height="4" fill="white" />
                    <rect class="ls_3_4" x="16" y="12" width="4" height="4" fill="white" />
                    <rect class="ls_3_5" x="20" y="12" width="4" height="4" fill="white" />
                    <rect class="ls_4_0" x="0" y="16" width="4" height="4" fill="white" />
                    <rect class="ls_4_1" x="4" y="16" width="4" height="4" fill="white" />
                    <rect class="ls_4_2" x="8" y="16" width="4" height="4" fill="white" />
                    <rect class="ls_4_3" x="12" y="16" width="4" height="4" fill="white" />
                    <rect class="ls_4_4" x="16" y="16" width="4" height="4" fill="white" />
                    <rect class="ls_4_5" x="20" y="16" width="4" height="4" fill="white" />
                    <rect class="ls_5_0" x="0" y="20" width="4" height="4" fill="white" />
                    <rect class="ls_5_1" x="4" y="20" width="4" height="4" fill="white" />
                    <rect class="ls_5_2" x="8" y="20" width="4" height="4" fill="white" />
                    <rect class="ls_5_3" x="12" y="20" width="4" height="4" fill="white" />
                    <rect class="ls_5_4" x="16" y="20" width="4" height="4" fill="white" />
                    <rect class="ls_5_5" x="20" y="20" width="4" height="4" fill="white" />
                </mask>
            </defs>
            <style>
                {`
                    @keyframes ls_sz{0%,50%{width:4px;height:4px}25%{width:0.5px;height:0.5px}}
                    @keyframes ls_p0_0{0%,50%{x:0px;y:0px}25%{x:1.75px;y:1.75px}}
                    @keyframes ls_p0_1{0%,50%{x:4px;y:0px}25%{x:5.75px;y:1.75px}}
                    @keyframes ls_p0_2{0%,50%{x:8px;y:0px}25%{x:9.75px;y:1.75px}}
                    @keyframes ls_p0_3{0%,50%{x:12px;y:0px}25%{x:13.75px;y:1.75px}}
                    @keyframes ls_p0_4{0%,50%{x:16px;y:0px}25%{x:17.75px;y:1.75px}}
                    @keyframes ls_p0_5{0%,50%{x:20px;y:0px}25%{x:21.75px;y:1.75px}}
                    @keyframes ls_p1_0{0%,50%{x:0px;y:4px}25%{x:1.75px;y:5.75px}}
                    @keyframes ls_p1_1{0%,50%{x:4px;y:4px}25%{x:5.75px;y:5.75px}}
                    @keyframes ls_p1_2{0%,50%{x:8px;y:4px}25%{x:9.75px;y:5.75px}}
                    @keyframes ls_p1_3{0%,50%{x:12px;y:4px}25%{x:13.75px;y:5.75px}}
                    @keyframes ls_p1_4{0%,50%{x:16px;y:4px}25%{x:17.75px;y:5.75px}}
                    @keyframes ls_p1_5{0%,50%{x:20px;y:4px}25%{x:21.75px;y:5.75px}}
                    @keyframes ls_p2_0{0%,50%{x:0px;y:8px}25%{x:1.75px;y:9.75px}}
                    @keyframes ls_p2_1{0%,50%{x:4px;y:8px}25%{x:5.75px;y:9.75px}}
                    @keyframes ls_p2_2{0%,50%{x:8px;y:8px}25%{x:9.75px;y:9.75px}}
                    @keyframes ls_p2_3{0%,50%{x:12px;y:8px}25%{x:13.75px;y:9.75px}}
                    @keyframes ls_p2_4{0%,50%{x:16px;y:8px}25%{x:17.75px;y:9.75px}}
                    @keyframes ls_p2_5{0%,50%{x:20px;y:8px}25%{x:21.75px;y:9.75px}}
                    @keyframes ls_p3_0{0%,50%{x:0px;y:12px}25%{x:1.75px;y:13.75px}}
                    @keyframes ls_p3_1{0%,50%{x:4px;y:12px}25%{x:5.75px;y:13.75px}}
                    @keyframes ls_p3_2{0%,50%{x:8px;y:12px}25%{x:9.75px;y:13.75px}}
                    @keyframes ls_p3_3{0%,50%{x:12px;y:12px}25%{x:13.75px;y:13.75px}}
                    @keyframes ls_p3_4{0%,50%{x:16px;y:12px}25%{x:17.75px;y:13.75px}}
                    @keyframes ls_p3_5{0%,50%{x:20px;y:12px}25%{x:21.75px;y:13.75px}}
                    @keyframes ls_p4_0{0%,50%{x:0px;y:16px}25%{x:1.75px;y:17.75px}}
                    @keyframes ls_p4_1{0%,50%{x:4px;y:16px}25%{x:5.75px;y:17.75px}}
                    @keyframes ls_p4_2{0%,50%{x:8px;y:16px}25%{x:9.75px;y:17.75px}}
                    @keyframes ls_p4_3{0%,50%{x:12px;y:16px}25%{x:13.75px;y:17.75px}}
                    @keyframes ls_p4_4{0%,50%{x:16px;y:16px}25%{x:17.75px;y:17.75px}}
                    @keyframes ls_p4_5{0%,50%{x:20px;y:16px}25%{x:21.75px;y:17.75px}}
                    @keyframes ls_p5_0{0%,50%{x:0px;y:20px}25%{x:1.75px;y:21.75px}}
                    @keyframes ls_p5_1{0%,50%{x:4px;y:20px}25%{x:5.75px;y:21.75px}}
                    @keyframes ls_p5_2{0%,50%{x:8px;y:20px}25%{x:9.75px;y:21.75px}}
                    @keyframes ls_p5_3{0%,50%{x:12px;y:20px}25%{x:13.75px;y:21.75px}}
                    @keyframes ls_p5_4{0%,50%{x:16px;y:20px}25%{x:17.75px;y:21.75px}}
                    @keyframes ls_p5_5{0%,50%{x:20px;y:20px}25%{x:21.75px;y:21.75px}}
                    .ls_0_0{animation:ls_sz 1.2s linear infinite,ls_p0_0 1.2s linear infinite}
                    .ls_0_1{animation:ls_sz 1.2s linear infinite,ls_p0_1 1.2s linear infinite;animation-delay:.05s}
                    .ls_0_2{animation:ls_sz 1.2s linear infinite,ls_p0_2 1.2s linear infinite;animation-delay:.1s}
                    .ls_0_3{animation:ls_sz 1.2s linear infinite,ls_p0_3 1.2s linear infinite;animation-delay:.15s}
                    .ls_0_4{animation:ls_sz 1.2s linear infinite,ls_p0_4 1.2s linear infinite;animation-delay:.2s}
                    .ls_0_5{animation:ls_sz 1.2s linear infinite,ls_p0_5 1.2s linear infinite;animation-delay:.25s}
                    .ls_1_0{animation:ls_sz 1.2s linear infinite,ls_p1_0 1.2s linear infinite;animation-delay:.05s}
                    .ls_1_1{animation:ls_sz 1.2s linear infinite,ls_p1_1 1.2s linear infinite;animation-delay:.1s}
                    .ls_1_2{animation:ls_sz 1.2s linear infinite,ls_p1_2 1.2s linear infinite;animation-delay:.15s}
                    .ls_1_3{animation:ls_sz 1.2s linear infinite,ls_p1_3 1.2s linear infinite;animation-delay:.2s}
                    .ls_1_4{animation:ls_sz 1.2s linear infinite,ls_p1_4 1.2s linear infinite;animation-delay:.25s}
                    .ls_1_5{animation:ls_sz 1.2s linear infinite,ls_p1_5 1.2s linear infinite;animation-delay:.3s}
                    .ls_2_0{animation:ls_sz 1.2s linear infinite,ls_p2_0 1.2s linear infinite;animation-delay:.1s}
                    .ls_2_1{animation:ls_sz 1.2s linear infinite,ls_p2_1 1.2s linear infinite;animation-delay:.15s}
                    .ls_2_2{animation:ls_sz 1.2s linear infinite,ls_p2_2 1.2s linear infinite;animation-delay:.2s}
                    .ls_2_3{animation:ls_sz 1.2s linear infinite,ls_p2_3 1.2s linear infinite;animation-delay:.25s}
                    .ls_2_4{animation:ls_sz 1.2s linear infinite,ls_p2_4 1.2s linear infinite;animation-delay:.3s}
                    .ls_2_5{animation:ls_sz 1.2s linear infinite,ls_p2_5 1.2s linear infinite;animation-delay:.35s}
                    .ls_3_0{animation:ls_sz 1.2s linear infinite,ls_p3_0 1.2s linear infinite;animation-delay:.15s}
                    .ls_3_1{animation:ls_sz 1.2s linear infinite,ls_p3_1 1.2s linear infinite;animation-delay:.2s}
                    .ls_3_2{animation:ls_sz 1.2s linear infinite,ls_p3_2 1.2s linear infinite;animation-delay:.25s}
                    .ls_3_3{animation:ls_sz 1.2s linear infinite,ls_p3_3 1.2s linear infinite;animation-delay:.3s}
                    .ls_3_4{animation:ls_sz 1.2s linear infinite,ls_p3_4 1.2s linear infinite;animation-delay:.35s}
                    .ls_3_5{animation:ls_sz 1.2s linear infinite,ls_p3_5 1.2s linear infinite;animation-delay:.4s}
                    .ls_4_0{animation:ls_sz 1.2s linear infinite,ls_p4_0 1.2s linear infinite;animation-delay:.2s}
                    .ls_4_1{animation:ls_sz 1.2s linear infinite,ls_p4_1 1.2s linear infinite;animation-delay:.25s}
                    .ls_4_2{animation:ls_sz 1.2s linear infinite,ls_p4_2 1.2s linear infinite;animation-delay:.3s}
                    .ls_4_3{animation:ls_sz 1.2s linear infinite,ls_p4_3 1.2s linear infinite;animation-delay:.35s}
                    .ls_4_4{animation:ls_sz 1.2s linear infinite,ls_p4_4 1.2s linear infinite;animation-delay:.4s}
                    .ls_4_5{animation:ls_sz 1.2s linear infinite,ls_p4_5 1.2s linear infinite;animation-delay:.45s}
                    .ls_5_0{animation:ls_sz 1.2s linear infinite,ls_p5_0 1.2s linear infinite;animation-delay:.25s}
                    .ls_5_1{animation:ls_sz 1.2s linear infinite,ls_p5_1 1.2s linear infinite;animation-delay:.3s}
                    .ls_5_2{animation:ls_sz 1.2s linear infinite,ls_p5_2 1.2s linear infinite;animation-delay:.35s}
                    .ls_5_3{animation:ls_sz 1.2s linear infinite,ls_p5_3 1.2s linear infinite;animation-delay:.4s}
                    .ls_5_4{animation:ls_sz 1.2s linear infinite,ls_p5_4 1.2s linear infinite;animation-delay:.45s}
                    .ls_5_5{animation:ls_sz 1.2s linear infinite,ls_p5_5 1.2s linear infinite;animation-delay:.5s}
                    .ls-primary{fill:#f43f5e}
                    .ls-text{fill:white}
                    .ls-bg{fill:#f43f5e}
                `}
            </style>
            <g mask="url(#ls-mask)">
                <g transform="translate(0, 2) scale(0.166)">
                    <path
                        class="ls-primary"
                        d="M0,60.12c0,39.92.08,60.12.24,60.12.13,0,.54-.19.9-.42s1.87-1.28,3.35-2.34c1.48-1.06,3.78-2.68,5.1-3.6,1.33-.92,3.7-2.6,5.28-3.72,1.57-1.12,4.33-3.07,6.12-4.32,1.8-1.25,3.99-2.8,4.88-3.43.88-.63,2.41-1.71,3.4-2.4.98-.69,2.22-1.55,2.76-1.92l.97-.66h111.72s0-97.43,0-97.43H0v60.12Z"
                    />
                    <path
                        class="ls-text"
                        d="M121.68,12.48l-.08,7.86c-.08,7.47-.12,8-.73,10.74-.35,1.58-1.13,4.82-1.73,7.2-.61,2.38-1.91,7.24-2.91,10.8-.99,3.56-2.1,7.56-2.47,8.88-.37,1.32-1.21,4.34-1.88,6.72-.66,2.38-1.65,6.05-2.18,8.16-.53,2.11-1.19,4.92-1.46,6.24-.27,1.32-.49,2.7-.48,3.72h-13.68v-.9c0-.49.21-2.09.46-3.54s.9-4.48,1.45-6.72c.54-2.24,1.58-6.29,2.32-9,.73-2.71,2.23-8.11,3.33-12,1.11-3.89,2.78-9.94,3.71-13.44s1.91-7.47,2.17-8.82c.27-1.35.48-2.62.48-2.82,0-.3-.49-.36-6-.36v12l-13.56-.12-.06-12c-.04-6.6,0-12.13.05-12.3.09-.24,3.65-.3,33.25-.3ZM84.24,12.48v49.2l2.76.12v11.76l-2.76.12v9.12h-13.68v-9.12h-18.96v-11.88l.97-2.52c.54-1.39,1.83-4.73,2.87-7.44,1.04-2.71,2.61-6.76,3.48-9,.87-2.24,2.16-5.59,2.88-7.44.71-1.85,2-5.2,2.87-7.44.87-2.24,2.52-6.51,3.65-9.48,1.14-2.97,2.17-5.53,2.3-5.7.18-.23,1.86-.3,13.62-.30ZM32.52,11.7c.66.04,1.96.19,2.88.33.92.15,2.49.57,3.48.95.99.37,2.45,1.1,3.24,1.61.79.51,2.04,1.57,2.76,2.35.73.78,1.62,2.01,1.98,2.74.35.73.81,1.97,1.01,2.76.3,1.14.37,2.97.37,8.82,0,6.87-.03,7.48-.51,8.88-.27.82-.87,2.07-1.32,2.76-.44.69-1.7,2.19-2.79,3.33s-3.92,3.77-6.3,5.84c-2.38,2.08-5.06,4.57-5.96,5.55-.9.98-1.9,2.32-2.22,2.98-.55,1.13-.59,1.43-.58,9.48h6v-11.76h13.68l-.12,24.36-33.24.12v-12.9c.01-11.62.06-13.02.43-14.1.23-.66.85-1.84,1.37-2.63.53-.78,1.72-2.23,2.64-3.21.92-.99,3.52-3.42,5.76-5.4,2.24-1.99,4.82-4.37,5.73-5.31.91-.93,1.96-2.12,2.33-2.65.36-.53.84-1.45,1.05-2.04.3-.85.38-2.07.38-5.64,0-4.25-.04-4.63-.55-5.64-.3-.59-.81-1.22-1.14-1.39-.33-.17-1.1-.28-1.71-.24-.7.04-1.3.25-1.63.55-.29.26-.63.86-.75,1.32-.13.46-.23,3.73-.23,13.68h-13.68v-6.9c.01-3.9.12-7.37.26-7.98.14-.59.58-1.78.99-2.64.51-1.08,1.27-2.08,2.45-3.24,1.05-1.04,2.34-2.02,3.38-2.56.92-.48,2.44-1.11,3.36-1.39s2.65-.59,3.84-.69c1.19-.09,2.7-.14,3.36-.1ZM133.5,5.28c.88,0,1.7.16,2.28.46.5.25,1.19.76,1.55,1.14.35.37.81,1.09,1.02,1.58.2.5.37,1.39.37,1.98s-.17,1.49-.37,1.98c-.21.5-.67,1.21-1.02,1.58-.36.38-1.03.88-1.49,1.11s-1.22.49-1.68.58c-.5.09-1.35.01-2.1-.21-.69-.2-1.6-.66-2.01-1.02-.42-.36-.96-1.06-1.2-1.56-.25-.49-.51-1.3-.59-1.8-.08-.49-.03-1.33.11-1.86.13-.53.55-1.4.93-1.94.4-.58,1.12-1.2,1.75-1.5.71-.35,1.53-.52,2.45-.52Z"
                    />
                    <path
                        class="ls-bg"
                        d="M67.8,51.54c-1.43,3.79-2.91,7.63-3.28,8.52l-.68,1.62h6.72c0-13.21-.03-17.04-.08-17.04-.04,0-1.25,3.1-2.68,6.9Z"
                    />
                </g>
            </g>
        </svg>
    );
}
