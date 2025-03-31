import { Head } from "$fresh/runtime.ts";
import ThreeScene from "../islands/ThreeScene.tsx";

export default function ThreePage() {
  return (
    <>
      <Head>
        <title>3D Scene Example</title>
      </Head>
      <div class="p-4 mx-auto max-w-screen-md">
        <h1 class="text-4xl font-bold text-center my-6">3D Scene Example</h1>
        <p class="my-6 text-center">
          This page demonstrates a WebGL canvas using React Three Fiber with Preact in Deno Fresh.
        </p>
        <ThreeScene />
      </div>
    </>
  );
}