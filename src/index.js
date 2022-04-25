import Visualizer, {
  VISUALIZER_STYLE_2D,
  VISUALIZER_STYLE_3D
} from '../src/visualizer';


window.onload = () => {
  const startButton = document.getElementById("start-btn");

  // The third argument assures this event will stop listening after first fire.
  // Since the button is hidden after the first click, there is no need to keep the listener anymore.
  startButton.addEventListener("click", onStartButtonClicked, { once: true });
};

function onStartButtonClicked(event) {
  // Removes the start button from the DOM, because it is going to be replaced by the audio control.
  event.target.remove();
 
  // Gets a reference to the audio element.
  const audio = document.getElementById("audio-controls");

  // Shows the audio controls. 
  audio.classList.remove("d-none");

  // Creates the visualizer with it's options.
  const vizualizer = new Visualizer({
    containerSelector: '.visualizer', // required
    audioElement: audio,              // required
    style: VISUALIZER_STYLE_3D,       // You can try VISUALIZER_STYLE_2D as well.
    volume: 0.8,
    loopAudio: true,
  });

  // Starts the music and bar animation.
  vizualizer.start();
}
