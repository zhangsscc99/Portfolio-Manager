import cv2
import os

def cut_video_into_frames(video_path, num_frames, destin_video_frames_folder):
    """
    将视频平均切割为指定数量的帧，并保存到目标文件夹。
    :param video_path: 视频文件路径
    :param num_frames: 需要提取的帧数
    :param destin_video_frames_folder: 保存帧图片的目标文件夹
    :return: (帧图片文件名列表, 目标文件夹路径)
    """
    # 创建目标文件夹
    os.makedirs(destin_video_frames_folder, exist_ok=True)

    # 打开视频文件
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Cannot open video file: {video_path}")

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    if num_frames > total_frames:
        num_frames = total_frames  # 不能超过视频总帧数

    # 计算每隔多少帧取一帧
    step = total_frames // num_frames

    frames_picture_no = []
    for i in range(num_frames):
        frame_no = i * step
        cap.set(cv2.CAP_PROP_POS_FRAMES, frame_no)
        ret, frame = cap.read()
        if not ret:
            break
        frame_filename = f"frame_{i+1:03d}.jpg"
        frame_path = os.path.join(destin_video_frames_folder, frame_filename)
        cv2.imwrite(frame_path, frame)
        frames_picture_no.append(frame_filename)

    cap.release()
    return frames_picture_no, destin_video_frames_folder

# 示例用法
frames, folder = cut_video_into_frames("bygrames.mp4", 50, "video_frames")
