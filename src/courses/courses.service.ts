import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Course } from './entities/courses.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository, DataSource, QueryRunner } from 'typeorm';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { UdemyQuestionBanksService } from 'src/udemyQuestionBanks/udemy-question-banks.service';
import { CourseSetsService } from 'src/course-sets/course-sets.service';
import { CourseSet } from 'src/course-sets/entities/course-set.entity';
@Injectable()
export class CoursesService {
  private logger = new Logger(CoursesService.name);

  constructor(
    @InjectRepository(Course)
    private readonly coursesRepository: Repository<Course>,
    private readonly courseSetsService: CourseSetsService,
    private readonly udemyQuestionBanksService: UdemyQuestionBanksService,
    private readonly dataSource: DataSource,
  ) {}

  // Kiểm tra và điều chỉnh số lượng câu hỏi trong mỗi set
  // async adjustQuestionDistribution(
  //   courseSets: CourseSet[],
  //   questionsPerSet: number,
  // ) {
  //   // Duyệt qua từng set
  //   for (let i = 0; i < courseSets.length; i++) {
  //     try {
  //       // Lấy set hiện tại cùng với các câu hỏi
  //       const courseSet = await this.courseSetsService.findOne(
  //         courseSets[i].id,
  //       );

  //       if (!courseSet) {
  //         console.log(`Không tìm thấy set với id ${courseSets[i].id}`);
  //         continue;
  //       }

  //       // Số câu hỏi hiện có trong set
  //       const currentQuestionCount = courseSet.udemyQuestionBanks.length;

  //       // Nếu thiếu câu hỏi
  //       if (currentQuestionCount < questionsPerSet) {
  //         const shortage = questionsPerSet - currentQuestionCount;
  //         console.log(`Set ${i + 1} thiếu ${shortage} câu hỏi`);

  //         // Lấy câu hỏi từ các set trước để bù vào
  //         let borrowedQuestions = [];

  //         // Duyệt qua các set trước đó
  //         for (let j = 0; j < i && borrowedQuestions.length < shortage; j++) {
  //           // Lấy thông tin set nguồn
  //           const sourceSet = await this.courseSetsService.findOne(
  //             courseSets[j].id,
  //           );

  //           if (!sourceSet || !sourceSet.udemyQuestionBanks) {
  //             console.log(
  //               `Không tìm thấy set nguồn với id ${courseSets[j].id} hoặc không có câu hỏi`,
  //             );
  //             continue;
  //           }

  //           // Số câu hỏi có thể lấy từ set này (không lấy quá nhiều từ một set)
  //           const canBorrow = Math.min(
  //             Math.ceil(sourceSet.udemyQuestionBanks.length * 0.2), // Lấy tối đa 20% số câu hỏi từ mỗi set
  //             shortage - borrowedQuestions.length,
  //           );

  //           if (canBorrow <= 0) continue;

  //           // Lấy các câu hỏi từ set trước để mượn
  //           const questionsToBorrow = sourceSet.udemyQuestionBanks.slice(
  //             0,
  //             canBorrow,
  //           );

  //           // Thêm vào danh sách câu hỏi mượn
  //           borrowedQuestions = [...borrowedQuestions, ...questionsToBorrow];

  //           console.log(
  //             `Đã mượn ${questionsToBorrow.length} câu hỏi từ Set ${j + 1}`,
  //           );
  //         }

  //         // Thêm câu hỏi đã mượn vào set hiện tại
  //         if (borrowedQuestions.length > 0) {
  //           // Tránh trùng lặp câu hỏi bằng cách kiểm tra ID
  //           const existingQuestionIds = new Set(
  //             courseSet.udemyQuestionBanks.map((q) => q.id),
  //           );
  //           const uniqueBorrowedQuestions = borrowedQuestions.filter(
  //             (q) => !existingQuestionIds.has(q.id),
  //           );

  //           courseSet.udemyQuestionBanks = [
  //             ...courseSet.udemyQuestionBanks,
  //             ...uniqueBorrowedQuestions,
  //           ];
  //           await this.courseSetsService.create(courseSet);

  //           console.log(
  //             `Đã thêm ${uniqueBorrowedQuestions.length} câu hỏi vào Set ${i + 1}`,
  //           );
  //         }
  //       }
  //     } catch (error) {
  //       console.error(`Lỗi khi xử lý Set ${i + 1}:`, error);
  //     }
  //   }
  // }

  async adjustQuestionDistribution(
    categoryName: string,
    totalSets: number,
    minQuestionsPerSet: number,
    courseSets: CourseSet[],
    queryRunner: QueryRunner,
    questionsPerSet: number,
  ) {
    const { questions: allQuestions, total: totalQuestions } =
      await this.udemyQuestionBanksService.findAllByCategoryName(categoryName);
    // Kiểm tra số lượng câu hỏi có sẵn
    if (totalQuestions < totalSets * minQuestionsPerSet) {
      throw new BadRequestException(
        `Không đủ câu hỏi! Cần ít nhất ${totalSets * minQuestionsPerSet} câu hỏi để phân phối hợp lý.`,
      );
    }

    // Xóa toàn bộ câu hỏi hiện có trong các set (nếu có)
    for (const set of courseSets) {
      // Sử dụng query trực tiếp để hiệu quả hơn
      await queryRunner.manager.query(
        `DELETE FROM course_set_udemy_question_banks_udemy_question_bank WHERE "courseSetId" = $1`,
        [set.id],
      );
    }

    // Tính toán phân phối ban đầu
    const baseQuestionsPerSet = Math.floor(totalQuestions / totalSets);
    const remainder = totalQuestions % totalSets;

    this.logger.log(
      `Phân phối ban đầu: ${baseQuestionsPerSet} câu hỏi/set, với ${remainder} câu dư`,
    );

    let questionIndex = 0;
    for (let i = 0; i < totalSets; i++) {
      const setQuestionCount = baseQuestionsPerSet + (i < remainder ? 1 : 0);
      const setQuestions = allQuestions.slice(
        questionIndex,
        questionIndex + setQuestionCount,
      );
      questionIndex += setQuestionCount;

      if (setQuestions.length === 0) {
        this.logger.warn(`Không có câu hỏi để phân phối cho Set ${i + 1}`);
        continue;
      }

      // Tạo mảng các bản ghi liên kết để thêm hàng loạt
      const relations = setQuestions.map((question) => ({
        courseSetId: courseSets[i].id,
        udemyQuestionBankId: question.id,
      }));

      // Batch insert để cải thiện hiệu suất
      if (relations.length > 0) {
        await queryRunner.manager
          .createQueryBuilder()
          .insert()
          .into('course_set_udemy_question_banks_udemy_question_bank')
          .values(relations)
          .execute();

        this.logger.log(
          `Đã phân phối ${setQuestions.length} câu hỏi vào Set ${i + 1}`,
        );
      }
    }

    // Mượn câu hỏi để đảm bảo mỗi set có đủ câu hỏi
    for (let i = 0; i < totalSets; i++) {
      // Đếm số câu hỏi hiện có trong set
      const currentCount = await queryRunner.manager.query(
        `SELECT COUNT(*) FROM course_set_udemy_question_banks_udemy_question_bank WHERE "courseSetId" = $1`,
        [courseSets[i].id],
      );

      const shortage = questionsPerSet - parseInt(currentCount[0].count);

      if (shortage <= 0) continue;

      this.logger.log(`Set ${i + 1} cần thêm ${shortage} câu hỏi`);

      // Lấy ID của các câu hỏi hiện có trong set
      const existingQuestionResult = await queryRunner.manager.query(
        `SELECT "udemyQuestionBankId" FROM course_set_udemy_question_banks_udemy_question_bank WHERE "courseSetId" = $1`,
        [courseSets[i].id],
      );

      const existingQuestionIds = new Set(
        existingQuestionResult.map((item) => item.udemyQuestionBankId),
      );
      const borrowedRelations = [];

      // Tính toán số câu hỏi cần mượn từ mỗi set
      const otherSets = totalSets - 1;
      const borrowPerSetBase = Math.floor(shortage / otherSets);
      const borrowRemainder = shortage % otherSets;

      let totalBorrowed = 0;
      let borrowCounter = 0;

      // Mượn câu hỏi từ các set khác
      for (let j = 0; j < totalSets && totalBorrowed < shortage; j++) {
        if (j === i) continue;

        const toBorrow =
          borrowPerSetBase + (borrowCounter < borrowRemainder ? 1 : 0);
        borrowCounter++;

        if (toBorrow <= 0) continue;

        // Lấy câu hỏi từ set nguồn mà chưa có trong set hiện tại
        const availableQuestionsResult = await queryRunner.manager.query(
          `SELECT q.id FROM udemy_question_bank q 
       JOIN course_set_udemy_question_banks_udemy_question_bank csq ON q.id = csq."udemyQuestionBankId" 
       WHERE csq."courseSetId" = $1 AND q.id NOT IN (
         SELECT "udemyQuestionBankId" FROM course_set_udemy_question_banks_udemy_question_bank WHERE "courseSetId" = $2
       )
       LIMIT $3`,
          [courseSets[j].id, courseSets[i].id, toBorrow],
        );

        if (availableQuestionsResult.length > 0) {
          const questionsToAdd = availableQuestionsResult.map((item) => ({
            courseSetId: courseSets[i].id,
            udemyQuestionBankId: item.id,
          }));

          borrowedRelations.push(...questionsToAdd);
          totalBorrowed += questionsToAdd.length;

          this.logger.log(
            `Mượn ${questionsToAdd.length} câu hỏi từ Set ${j + 1}`,
          );
        }
      }

      // Thêm các câu hỏi đã mượn vào set
      if (borrowedRelations.length > 0) {
        await queryRunner.manager
          .createQueryBuilder()
          .insert()
          .into('course_set_udemy_question_banks_udemy_question_bank')
          .values(borrowedRelations)
          .execute();

        this.logger.log(
          `Đã mượn tổng cộng ${borrowedRelations.length} câu hỏi vào Set ${i + 1}`,
        );
      }

      // Kiểm tra lại sau khi mượn
      const finalCount = await queryRunner.manager.query(
        `SELECT COUNT(*) FROM course_set_udemy_question_banks_udemy_question_bank WHERE "courseSetId" = $1`,
        [courseSets[i].id],
      );

      if (parseInt(finalCount[0].count) < questionsPerSet) {
        this.logger.warn(
          `Set ${i + 1} vẫn thiếu câu hỏi. Hiện có: ${finalCount[0].count}/${questionsPerSet}`,
        );
      }
    }
  }

  async createCourse(createCourse: CreateCourseDto) {
    const {
      categoryName,
      content,
      courseSets: totalSets,
      description,
      name,
      organizationName,
      price,
      status,
      type,
      udemyQuestionBanks: questionsPerSet,
    } = createCourse;
    const course = new Course();
    course.name = name;
    course.description = description;
    course.price = price;
    course.status = status;
    course.type = type;
    course.categoryName = categoryName;
    course.organizationName = organizationName;
    course.content = content;
    const minQuestionsPerSet = 100; // Ngưỡng tối thiểu hợp lý khi không đủ câu hỏi

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      const courseSaved = this.coursesRepository.create(course);
      const courseSets: CourseSet[] = [];
      for (let i = 0; i < totalSets; i++) {
        const courseSet = new CourseSet();
        courseSet.name = `Course Set ${i + 1}`;
        const courseSetSaved = await this.courseSetsService.create(courseSet);
        courseSets.push(courseSetSaved);
      }
      courseSaved.courseSets = courseSets;
      await this.coursesRepository.save(courseSaved);

      await this.adjustQuestionDistribution(
        categoryName,
        totalSets,
        minQuestionsPerSet,
        courseSets,
        queryRunner,
        questionsPerSet,
      );

      // Commit transaction nếu mọi thứ thành công
      await queryRunner.commitTransaction();

      // Kiểm tra kết quả cuối cùng
      const results = await Promise.all(
        courseSets.map(async (set) => {
          const fullSet = await this.courseSetsService.findOne(set.id);

          return {
            setId: set.id,
            name: set.name,
            questionCount: fullSet.udemyQuestionBanks.length,
          };
        }),
      );

      this.logger.log('Phân phối câu hỏi hoàn tất', results);
      return course;
    } catch (error) {
      // Rollback nếu có lỗi
      await queryRunner.rollbackTransaction();
      this.logger.error(`Lỗi khi phân phối câu hỏi: ${error.message}`);
      throw error;
    } finally {
      // Giải phóng queryRunner
      await queryRunner.release();
    }
  }

  async getCourses(page: number, limit: number) {
    try {
      const offset = (page - 1) * limit;

      const [items, total] = await this.coursesRepository.findAndCount({
        relations: ['udemyQuestionBanks'],
        order: {
          id: 'DESC',
        },
        take: limit,
        skip: offset,
      });

      return {
        items,
        total,
        page,
        limit,
      };
    } catch (error) {
      console.log('error', error);
      throw new BadRequestException('Error getting courses');
    }
  }

  async searchCourses(search: string, page: number, limit: number) {
    try {
      const offset = (page - 1) * limit;

      const [items, total] = await this.coursesRepository.findAndCount({
        where: { name: Like(`%${search}%`) },
        relations: ['udemyQuestionBanks'],
        order: {
          id: 'DESC',
        },
        take: limit,
        skip: offset,
      });

      return {
        items,
        total,
        page,
        limit,
      };
    } catch (error) {
      console.log('error', error);
      throw new BadRequestException('Error searching courses');
    }
  }

  async getCourseById(id: number) {
    try {
      const course = await this.coursesRepository.findOne({
        where: { id },
        relations: ['courseSets', 'courseSets.udemyQuestionBanks'],
      });

      if (!course) {
        throw new BadRequestException('Course not found');
      }

      return course;
    } catch (error) {
      console.log('error', error);
      throw new BadRequestException('Error getting course by id');
    }
  }

  async updateCourse(id: number, updateCourse: UpdateCourseDto) {
    await this.getCourseById(id);

    const {
      categoryName,
      content,
      courseSets: totalSets,
      description,
      name,
      organizationName,
      price,
      status,
      type,
      udemyQuestionBanks: questionsPerSet,
    } = updateCourse;
    const course = await this.getCourseById(id);
    course.name = name;
    course.description = description;
    course.price = price;
    course.status = status;
    course.type = type;
    course.categoryName = categoryName;
    course.organizationName = organizationName;
    course.content = content;
    course.courseSets = null;
    const minQuestionsPerSet = 100; // Ngưỡng tối thiểu hợp lý khi không đủ câu hỏi

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    try {
      await this.coursesRepository.save(course);
      const courseSets: CourseSet[] = [];
      for (let i = 0; i < totalSets; i++) {
        const courseSet = new CourseSet();
        courseSet.name = `Course Set ${i + 1}`;
        const courseSetSaved = await this.courseSetsService.create(courseSet);
        courseSets.push(courseSetSaved);
      }

      await this.adjustQuestionDistribution(
        categoryName,
        totalSets,
        minQuestionsPerSet,
        courseSets,
        queryRunner,
        questionsPerSet,
      );

      // Commit transaction nếu mọi thứ thành công
      await queryRunner.commitTransaction();

      // Kiểm tra kết quả cuối cùng
      const results = await Promise.all(
        courseSets.map(async (set) => {
          const fullSet = await this.courseSetsService.findOne(set.id);

          return {
            setId: set.id,
            name: set.name,
            questionCount: fullSet.udemyQuestionBanks.length,
          };
        }),
      );

      this.logger.log('Phân phối câu hỏi hoàn tất', results);
      return course;
    } catch (error) {
      // Rollback nếu có lỗi
      await queryRunner.rollbackTransaction();
      this.logger.error(`Lỗi khi update course: ${error.message}`);
      throw error;
    } finally {
      // Giải phóng queryRunner
      await queryRunner.release();
    }
  }

  async deleteCourse(id: number) {
    return this.coursesRepository.delete(id);
  }
}
