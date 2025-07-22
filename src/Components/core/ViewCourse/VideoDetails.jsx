import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { ControlBar, Player, BigPlayButton, LoadingSpinner, PlaybackRateMenuButton, ForwardControl, ReplayControl, CurrentTimeDisplay, TimeDivider } from 'video-react';
import { BiSkipPreviousCircle, BiSkipNextCircle } from 'react-icons/bi';
import { MdOutlineReplayCircleFilled } from 'react-icons/md';
import { markLectureAsComplete } from '../../../services/operations/courseDetailsAPI';
import { setCompletedLectures } from '../../../slices/viewCourseSlice';

const VideoDetails = () => {
  const { courseId, sectionId, subsectionId } = useParams();
  const dispatch = useDispatch();
  const { token } = useSelector(state => state.auth);
  const { user } = useSelector(state => state.profile);
  const { courseSectionData, completedLectures } = useSelector(state => state.viewCourse);
  const navigate = useNavigate();
  const playerRef = useRef(null);

  const [videoData, setVideoData] = useState([]);
  const [videoEnd, setVideoEnd] = useState(false);
  const [showFloating, setShowFloating] = useState(false);
  const [videoPausedByFloat, setVideoPausedByFloat] = useState(false);
  const [resumeAfterFloat, setResumeAfterFloat] = useState(false);
  const [timeStamps, setTimeStamps] = useState([]);

  useEffect(() => {
    if (courseSectionData.length === 0) return;
    const filteredSection = courseSectionData.find(section => section._id === sectionId);
    const filteredSubsection = filteredSection?.subSection?.find(sub => sub._id === subsectionId);
    setVideoData(filteredSubsection);
    setVideoEnd(false);
    setShowFloating(false);
    setVideoPausedByFloat(false);
    setResumeAfterFloat(false);
  }, [courseSectionData, sectionId, subsectionId]);

  const isLastLecture = () => {
    const sectionIndex = courseSectionData.findIndex(section => section._id === sectionId);
    const subIndex = courseSectionData[sectionIndex]?.subSection.findIndex(sub => sub._id === subsectionId);
    return subIndex === courseSectionData[sectionIndex]?.subSection.length - 1 && sectionIndex === courseSectionData.length - 1;
  };

  const isFirstLecture = () => {
    const sectionIndex = courseSectionData.findIndex(section => section._id === sectionId);
    const subIndex = courseSectionData[sectionIndex]?.subSection.findIndex(sub => sub._id === subsectionId);
    return subIndex === 0 && sectionIndex === 0;
  };

  const nextLecture = () => {
    if (isLastLecture()) return;
    const sectionIndex = courseSectionData.findIndex(section => section._id === sectionId);
    const subIndex = courseSectionData[sectionIndex]?.subSection.findIndex(sub => sub._id === subsectionId);
    if (subIndex === courseSectionData[sectionIndex]?.subSection.length - 1) {
      const nextSection = courseSectionData[sectionIndex + 1];
      navigate(`/dashboard/enrolled-courses/view-course/${courseId}/section/${nextSection._id}/sub-section/${nextSection.subSection[0]._id}`);
    } else {
      const currentSection = courseSectionData[sectionIndex];
      navigate(`/dashboard/enrolled-courses/view-course/${courseId}/section/${currentSection._id}/sub-section/${currentSection.subSection[subIndex + 1]._id}`);
    }
  };

  const previousLecture = () => {
    if (isFirstLecture()) return;
    const sectionIndex = courseSectionData.findIndex(section => section._id === sectionId);
    const subIndex = courseSectionData[sectionIndex]?.subSection.findIndex(sub => sub._id === subsectionId);
    if (subIndex === 0) {
      const previousSection = courseSectionData[sectionIndex - 1];
      navigate(`/dashboard/enrolled-courses/view-course/${courseId}/section/${previousSection._id}/sub-section/${previousSection.subSection[previousSection.subSection.length - 1]._id}`);
    } else {
      const currentSection = courseSectionData[sectionIndex];
      navigate(`/dashboard/enrolled-courses/view-course/${courseId}/section/${currentSection._id}/sub-section/${currentSection.subSection[subIndex - 1]._id}`);
    }
  };

  const handleLectureCompletion = async () => {
    await markLectureAsComplete({ userId: user._id, courseId, subSectionId: subsectionId }, token);
    dispatch(setCompletedLectures([...completedLectures, videoData._id]));
  };

  const handleTimeUpdate = (e) => {
    const currentTime = e.target.currentTime;
    if (currentTime >= 120 && !videoPausedByFloat) {
      playerRef.current.pause();
      setVideoPausedByFloat(true);
      setShowFloating(true);
      setTimeStamps((prev) => [...prev, currentTime]);
    }
    if (videoPausedByFloat && !resumeAfterFloat) {
      playerRef.current.pause();
    }
  };

  const handleFloatingClick = () => {
    setShowFloating(false);
    setVideoPausedByFloat(false);
    setResumeAfterFloat(true);
    playerRef.current.play();
  };

  return (
    <div className='md:w-[calc(100vw-320px)] w-screen p-3'>
      {!videoData ? <h1>Loading...</h1> : (
        <div>
          <Player
            className="w-full relative"
            ref={playerRef}
            src={videoData.videoUrl}
            aspectRatio="16:9"
            fluid={true}
            autoPlay={false}
            onEnded={() => setVideoEnd(true)}
            onTimeUpdate={handleTimeUpdate}
          >
            <BigPlayButton position="center" />
            <LoadingSpinner />
            <ControlBar>
              <PlaybackRateMenuButton rates={[5, 2, 1, 0.5, 0.1]} order={7.1} />
              <ReplayControl seconds={5} order={7.1} />
              <ForwardControl seconds={5} order={7.2} />
              <TimeDivider order={4.2} />
              <CurrentTimeDisplay order={4.1} />
              <TimeDivider order={4.2} />
            </ControlBar>

            {videoEnd && (
              <div className='flex justify-center items-center'>
                {!completedLectures.includes(videoData._id) && (
                  <button onClick={handleLectureCompletion} className='bg-yellow-100 text-richblack-900 absolute top-[20%] hover:scale-90 z-20 font-medium md:text-sm px-4 py-2 rounded-md'>Mark as Completed</button>
                )}

                {!isFirstLecture() && (
                  <BiSkipPreviousCircle onClick={previousLecture} className="absolute left-0 top-1/2 transform -translate-y-1/2 z-20 m-5 text-2xl md:text-5xl bg-richblack-600 rounded-full cursor-pointer hover:scale-90" />
                )}

                {!isLastLecture() && (
                  <BiSkipNextCircle onClick={nextLecture} className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 m-5 text-2xl md:text-5xl bg-richblack-600 rounded-full cursor-pointer hover:scale-90" />
                )}

                <MdOutlineReplayCircleFilled onClick={() => { playerRef.current.seek(0); playerRef.current.play(); setVideoEnd(false); }} className="absolute top-1/2 z-20 text-2xl md:text-5xl bg-richblack-600 rounded-full cursor-pointer hover:scale-90" />
              </div>
            )}
          </Player>

          {showFloating && (
            <div className="fixed top-[20%] left-1/2 transform -translate-x-1/2 bg-yellow-100 text-black p-6 w-[600px] h-[400px] rounded-xl shadow-lg z-[9999] box-border">
              <div className="flex justify-end">
                <button onClick={() => setShowFloating(false)} className="text-lg font-bold text-red-500">✕</button>
              </div>
              <div className="flex flex-col items-center justify-center h-full">
                <p className="mb-4 text-xl font-semibold">Please click to continue watching</p>
                <button onClick={handleFloatingClick} className="bg-richblack-800 text-white px-6 py-3 rounded-md hover:scale-95 transition-transform">
                  Resume Video
                </button>

                <button>
                  Resume Video
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <div className='mt-5'>
        <h1 className='text-2xl font-bold text-richblack-25'>{videoData?.title}</h1>
        <p className='text-gray-500 text-richblack-100'>{videoData?.description}</p>
      </div>
    </div>
  );
};

export default VideoDetails;
