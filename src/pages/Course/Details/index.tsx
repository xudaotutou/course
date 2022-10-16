import { useCallback, useEffect, useState, useRef } from 'react'
import { last, groupBy, keys, sortBy, find } from 'lodash'
import { useParams } from 'react-router-dom'
import Tabs from '../../../components/Tabs'
import RegisterModal from '../../../components/RegisterModal'
import { useAppState } from '../../../context'
import { RoleNameMap } from '../../../constants'
import { getCourse, getStudentOfCourse, getReplayOfCourse } from '../../../api'
import StudentList from './StudentList'
import { EUserType as EStudentType, IMyApplyCourse } from '../../../types'
import ReplayList from './ReplayList'

import './index.scss'

const Action = (props: {
  courseInfo: any
  onRegisterCourse?: (newCourse: IMyApplyCourse) => void
}) => {
  const {
    state: { currentUser, myCourses },
    dispatch
  } = useAppState()
  const openLoginDialog = () => {
    dispatch({
      type: 'UPDATE_LOGIN_DIALOG_VISIBLE',
      payload: true
    })
  }
  const enterCourse = (registerCourse: IMyApplyCourse) => {
    const { name, phone, status } = registerCourse
    const url = `https://room.rustedu.com?username=${name}&userId=${phone}&role=${
      RoleNameMap[status] || 'student'
    }&roomId=${props.courseInfo.roomId}&video=${props.courseInfo.ishd || '480p'}`
    window.open(url)
  }

  if (currentUser?.phone) {
    const registerCourse = find(myCourses, (course) => course.phone === currentUser.phone)

    return !!registerCourse ? (
      <button className="btn" onClick={() => enterCourse(registerCourse)}>
        已报名，进入教室
      </button>
    ) : (
      <RegisterModal {...props} />
    )
  }
  return (
    <button style={{ width: 100 }} className="btn" onClick={openLoginDialog}>
      登录
    </button>
  )
}
const CourseDetail = () => {
  const [courseInfo, setCourseInfo] = useState<any>({})
  const [students, setStudents] = useState<any[]>([])
  const detailRef = useRef<
    Partial<{
      applyStudents: any[]
      // applyMember: any[]
      teacher: any
      if_teacher: boolean

      replayList: any[]
      validReplayList: any[]
    }>
  >({})

  const [loading, setLoading] = useState(true)
  const { id: courseId } = useParams<{ id: string }>()
  const loadData = useCallback(async () => {
    if (courseId) {
      const courseInfo = await getCourse(courseId)

      // 课程报名成员信息
      const studentResult = await getStudentOfCourse(courseId)
      const studentCategories = groupBy(studentResult, 'status')
      const teacher = studentCategories[EStudentType.TEACHER] || []
      const tutors = studentCategories[EStudentType.TUTOR] || []
      const admins = studentCategories[EStudentType.ADMIN] || []
      let students: any[] = []
      keys(studentCategories)
        .filter(
          (key) =>
            ![EStudentType.TEACHER, EStudentType.TUTOR, EStudentType.ADMIN].includes(
              key as EStudentType
            )
        )
        .forEach((key) => {
          students = students.concat(studentCategories[key])
        })

      detailRef.current.applyStudents = students // 排除 老师，助教，管理员, 剩下的才认为是学生
      detailRef.current.teacher = last(teacher)
      setStudents(teacher.concat(tutors, admins, students))
      detailRef.current.if_teacher = !detailRef.current.teacher

      // 课程回放数据
      const courseResult = await getReplayOfCourse(courseId)
      detailRef.current.replayList = courseResult
      detailRef.current.validReplayList = sortBy(
        courseResult.filter(({ status }) => status == 1) || [],
        (c) => c.startAt
      )

      setCourseInfo(courseInfo)
      setLoading(false)
    }
  }, [courseId])
  useEffect(() => {
    loadData()
  }, [loadData])

  if (loading) {
    return <div>loading...</div>
  }

  const tabs = [
    {
      key: 'intro',
      title: '课程介绍',
      content: <div dangerouslySetInnerHTML={{ __html: courseInfo.introduction }} />
    },
    {
      key: 'student',
      title: `报名成员(${students?.length || 0})`,
      content: <StudentList data={students} />
    },
    {
      key: 'replay',
      title: `课程回放(${detailRef.current.validReplayList?.length})`,
      content: <ReplayList data={detailRef.current.validReplayList} />
    }
  ]
  const handleRegister = (newCourse: any) => {
    setStudents((students ||[]).concat(newCourse))
    detailRef.current.applyStudents = (detailRef.current.applyStudents || []).concat(newCourse)
  }
  return (
    <div className="course-detail-wrapper">
      <section className="main-content">
        <img src={courseInfo.coverUrl} alt="coverUrl" className="course-cover" />

        <div className="course-main-info">
          <div className="course-title">{courseInfo.title}</div>

          <div className="course-info-item">任课教师: {detailRef.current.teacher?.name}</div>
          <div className="course-info-item">
            学生人数: {detailRef.current.applyStudents?.length} 人
          </div>

          <div className="course-actions">
            <div className="course-price">¥ {courseInfo.price}</div>
            <Action courseInfo={courseInfo} onRegisterCourse={handleRegister} />
          </div>
        </div>
        <div className="share-area">
          <div className="share-box">
            <img src="/img/share.png" alt="share" />
            <span>分享二维码,</span>
            <span>邀请好友报名</span>
          </div>
          <div className="share-box">
            <img src="/img/minipro.jpeg" alt="mini" />
          </div>
        </div>
      </section>

      <section className="course-intro">
        <Tabs items={tabs} />
      </section>
    </div>
  )
}

export default CourseDetail
